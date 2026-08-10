"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AppLimits,
  ConvertOptions,
  ConvertResponse,
  InputFormat,
  InputFormatChoice,
  OutputFormat,
  QueuedFile,
} from "@/types/converter";
import {
  defaultConvertOptions,
  INPUT_ACCEPT,
  INPUT_FORMAT_CHOICES,
  INPUT_FORMAT_LABELS,
  OUTPUT_FORMAT_LABELS,
  supportsTransparency,
} from "@/lib/formats";
import { DEFAULT_LIMITS, formatBytes, sizeDeltaPercent } from "@/lib/limits";
import { inspectClientFileBrowser, checkCompatibility } from "@/lib/client-validate";
import { UserMessages } from "@/lib/errors";
import { withBasePath } from "@/lib/base-path";
import styles from "./ConverterApp.module.css";

const CONCURRENCY = 2;

function uid() {
  return crypto.randomUUID();
}

function resolveSourceFormat(
  choice: InputFormatChoice,
  detected?: InputFormat,
): InputFormat | undefined {
  if (choice !== "auto") return choice === "jpeg" ? "jpg" : choice;
  return detected;
}

export default function ConverterApp() {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [options, setOptions] = useState<ConvertOptions>(defaultConvertOptions("png"));
  const [limits, setLimits] = useState<AppLimits>(DEFAULT_LIMITS);
  const [notice, setNotice] = useState(
    "Os arquivos são temporários e serão excluídos automaticamente após a conversão.",
  );
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [usePerFileFormat, setUsePerFileFormat] = useState(false);

  useEffect(() => {
    fetch(withBasePath("/api/config"))
      .then((r) => r.json())
      .then((data) => {
        if (data.limits) setLimits(data.limits);
        if (data.notice) setNotice(data.notice);
      })
      .catch(() => undefined);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const totalBytes = useMemo(() => files.reduce((s, f) => s + f.size, 0), [files]);
  const doneCount = files.filter((f) => f.status === "done").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const readyCount = files.filter((f) => f.status === "ready" || f.status === "error" || f.status === "done").length;

  const addFiles = useCallback(
    async (list: FileList | File[]) => {
      const incoming = Array.from(list);
      if (!incoming.length) return;

      if (files.length + incoming.length > limits.maxFiles) {
        showToast(`${UserMessages.tooMany} Máximo: ${limits.maxFiles}.`);
        return;
      }

      const nextTotal = totalBytes + incoming.reduce((s, f) => s + f.size, 0);
      if (nextTotal > limits.maxBatchBytes) {
        showToast(UserMessages.batchTooLarge);
        return;
      }

      const prepared: QueuedFile[] = [];
      for (const file of incoming) {
        const inspected = await inspectClientFileBrowser(file);
        const manual = options.inputFormat !== "auto";

        if (!inspected.ok && !manual) {
          prepared.push({
            id: uid(),
            file,
            name: file.name,
            size: file.size,
            typeHint: file.type,
            status: "error",
            progress: 0,
            error: inspected.error,
          });
          continue;
        }

        const detected = inspected.ok ? inspected.detectedFormat : undefined;
        const sourceFormat = resolveSourceFormat(options.inputFormat, detected);

        if (!sourceFormat) {
          prepared.push({
            id: uid(),
            file,
            name: file.name,
            size: file.size,
            typeHint: file.type,
            status: "error",
            progress: 0,
            error: UserMessages.unsupported,
          });
          continue;
        }

        const compat = checkCompatibility(sourceFormat, options.outputFormat);
        prepared.push({
          id: uid(),
          file,
          name: file.name,
          size: file.size,
          typeHint: file.type,
          detectedFormat: detected,
          sourceFormat,
          width: inspected.ok ? inspected.width : undefined,
          height: inspected.ok ? inspected.height : undefined,
          previewUrl: inspected.ok ? inspected.previewUrl : "",
          status: compat.ok ? "ready" : "error",
          progress: 0,
          error: compat.ok ? undefined : compat.reason,
          outputFormat: options.outputFormat,
        });
      }

      setFiles((prev) => [...prev, ...prepared]);
    },
    [
      files.length,
      limits.maxBatchBytes,
      limits.maxFiles,
      options.inputFormat,
      options.outputFormat,
      showToast,
      totalBytes,
    ],
  );

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      if (target?.resultPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(target.resultPreviewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const clearList = () => {
    files.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      if (f.resultPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(f.resultPreviewUrl);
    });
    setFiles([]);
    setGlobalProgress(0);
  };

  const updateOptions = <K extends keyof ConvertOptions>(key: K, value: ConvertOptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const setInputFormat = (choice: InputFormatChoice) => {
    setOptions((prev) => ({ ...prev, inputFormat: choice }));
    setFiles((prev) =>
      prev.map((f) => {
        if (f.status === "done") return f;
        const sourceFormat = resolveSourceFormat(choice, f.detectedFormat);
        if (!sourceFormat) {
          return {
            ...f,
            sourceFormat: undefined,
            status: "error",
            error: UserMessages.unsupported,
          };
        }
        const compat = checkCompatibility(sourceFormat, f.outputFormat || options.outputFormat);
        return {
          ...f,
          sourceFormat,
          status: compat.ok ? "ready" : "error",
          error: compat.ok ? undefined : compat.reason,
        };
      }),
    );
  };

  const setOutputFormat = (format: OutputFormat) => {
    setOptions((prev) => ({ ...prev, outputFormat: format }));
    setFiles((prev) =>
      prev.map((f) => {
        const source = f.sourceFormat || f.detectedFormat;
        if (!source) return { ...f, outputFormat: format };
        const compat = checkCompatibility(source, format);
        return {
          ...f,
          outputFormat: format,
          status: f.status === "done" ? f.status : compat.ok ? "ready" : "error",
          error: compat.ok ? undefined : compat.reason,
        };
      }),
    );
  };

  const setFileOutput = (id: string, format: OutputFormat) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const source = f.sourceFormat || f.detectedFormat;
        if (!source) return { ...f, outputFormat: format };
        const compat = checkCompatibility(source, format);
        return {
          ...f,
          outputFormat: format,
          status: compat.ok ? "ready" : "error",
          error: compat.ok ? undefined : compat.reason,
        };
      }),
    );
  };

  const runQueue = async (onlyErrors = false) => {
    if (
      options.outputFormat === "pdf" &&
      options.format.pdfMode === "merged" &&
      !onlyErrors &&
      !usePerFileFormat
    ) {
      await convertMergedPdf();
      return;
    }

    const jobs = files.filter((f) =>
      onlyErrors
        ? f.status === "error" && Boolean(f.sourceFormat || f.detectedFormat)
        : f.status === "ready",
    );

    if (!jobs.length) {
      showToast(
        onlyErrors
          ? "Nenhum arquivo com erro para tentar novamente."
          : "Nenhuma imagem pronta para converter.",
      );
      return;
    }

    setBusy(true);
    abortRef.current = new AbortController();
    let completed = 0;
    const total = jobs.length;
    setGlobalProgress(0);

    const updateFile = (id: string, patch: Partial<QueuedFile>) => {
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    };

    const worker = async (job: QueuedFile) => {
      if (abortRef.current?.signal.aborted) return;
      updateFile(job.id, { status: "converting", progress: 15, error: undefined });

      try {
        const form = new FormData();
        form.append("file", job.file, job.name);
        form.append("options", JSON.stringify(options));
        const out = (usePerFileFormat ? job.outputFormat : options.outputFormat) || options.outputFormat;
        form.append("outputFormat", out);
        const source = job.sourceFormat || resolveSourceFormat(options.inputFormat, job.detectedFormat);
        if (source) form.append("inputFormat", source);

        const res = await fetch(withBasePath("/api/convert"), {
          method: "POST",
          body: form,
          signal: abortRef.current?.signal,
        });

        const data = (await res.json()) as ConvertResponse;
        if (!data.ok) {
          updateFile(job.id, { status: "error", progress: 100, error: data.error });
          return;
        }

        updateFile(job.id, {
          status: "done",
          progress: 100,
          resultId: data.resultId,
          resultName: data.fileName,
          resultSize: data.size,
          resultWidth: data.width,
          resultHeight: data.height,
          resultMime: data.mime,
          resultPreviewUrl: data.previewBase64,
          outputFormat: out,
          sourceFormat: (data.inputFormat as InputFormat) || source,
        });
      } catch (error) {
        if (abortRef.current?.signal.aborted) {
          updateFile(job.id, { status: "cancelled", progress: 0, error: "Cancelado." });
          return;
        }
        updateFile(job.id, {
          status: "error",
          progress: 100,
          error: UserMessages.network,
        });
        void error;
      } finally {
        completed += 1;
        setGlobalProgress(Math.round((completed / total) * 100));
      }
    };

    // Concurrency pool
    let index = 0;
    const runners = Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
      while (index < jobs.length) {
        if (abortRef.current?.signal.aborted) break;
        const current = jobs[index++];
        await worker(current);
      }
    });

    await Promise.all(runners);
    setBusy(false);
  };

  const convertMergedPdf = async () => {
    const source = files.filter(
      (f) =>
        (f.sourceFormat || f.detectedFormat) &&
        (f.status === "ready" || f.status === "done"),
    );
    const valid =
      source.length > 0
        ? source
        : files.filter(
            (f) => (f.sourceFormat || f.detectedFormat) && f.status !== "error",
          );

    if (!valid.length) {
      showToast("Nenhuma imagem válida para o PDF.");
      return;
    }

    setBusy(true);
    setGlobalProgress(10);
    try {
      const form = new FormData();
      form.append("mode", "merged-pdf");
      form.append("options", JSON.stringify(options));
      const order = options.format.pdfPageOrder.length
        ? options.format.pdfPageOrder
        : valid.map((f) => f.id);
      form.append("order", JSON.stringify(order));
      form.append("fileIds", JSON.stringify(valid.map((f) => f.id)));
      valid.forEach((f) => form.append("files", f.file, f.name));

      const res = await fetch(withBasePath("/api/convert"), { method: "POST", body: form });
      const data = (await res.json()) as ConvertResponse;
      setGlobalProgress(100);

      if (!data.ok) {
        showToast(data.error);
        return;
      }

      setFiles((prev) =>
        prev.map((f) =>
          valid.some((v) => v.id === f.id)
            ? {
                ...f,
                status: "done" as const,
                progress: 100,
                resultId: data.resultId,
                resultName: data.fileName,
                resultSize: data.size,
                resultWidth: data.width,
                resultHeight: data.height,
                resultMime: data.mime,
              }
            : f,
        ),
      );
    } catch {
      showToast(UserMessages.network);
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    setBusy(false);
    showToast("Conversão cancelada.");
  };

  const downloadOne = (resultId: string, name?: string) => {
    const a = document.createElement("a");
    a.href = withBasePath(`/api/download/${resultId}`);
    a.download = name || "convertido";
    a.click();
  };

  const downloadZip = async () => {
    const resultIds = [
      ...new Set(files.filter((f) => f.status === "done" && f.resultId).map((f) => f.resultId!)),
    ];
    if (!resultIds.length) {
      showToast("Nenhum arquivo convertido para baixar.");
      return;
    }
    try {
      const res = await fetch(withBasePath("/api/zip"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast(data?.error || UserMessages.network);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `imagens-convertidas.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast(UserMessages.network);
    }
  };

  const movePdfOrder = (id: string, dir: -1 | 1) => {
    setOptions((prev) => {
      const base = prev.format.pdfPageOrder.length
        ? [...prev.format.pdfPageOrder]
        : files.map((f) => f.id);
      const idx = base.indexOf(id);
      if (idx < 0) return prev;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= base.length) return prev;
      const copy = [...base];
      [copy[idx], copy[nextIdx]] = [copy[nextIdx], copy[idx]];
      return { ...prev, format: { ...prev.format, pdfPageOrder: copy } };
    });
  };

  const pdfOrder = options.format.pdfPageOrder.length
    ? options.format.pdfPageOrder
    : files.map((f) => f.id);

  const needsBackground =
    !supportsTransparency(options.outputFormat) ||
    options.outputFormat === "jpg" ||
    options.outputFormat === "bmp" ||
    options.outputFormat === "pdf";

  return (
    <div className={styles.shell}>
      <div className={styles.pageIntro}>
        <h1 className={styles.title}>Conversor de Imagens</h1>
        <p className={styles.subtitle}>
          Converta suas imagens para diferentes formatos com qualidade, rapidez e processamento em
          lote.
        </p>
      </div>

      <main className={styles.main}>
        <p className={styles.notice} role="status">
          {notice}
        </p>

        <section
          className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ""}`}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void addFiles(e.dataTransfer.files);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={INPUT_ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div className={styles.dropInner}>
            <strong>Arraste imagens aqui</strong>
            <span>ou clique para selecionar vários arquivos de uma vez</span>
            <div className={styles.dropActions}>
              <button type="button" className={styles.btnPrimary} onClick={() => inputRef.current?.click()}>
                {files.length ? "Adicionar imagens" : "Selecionar imagens"}
              </button>
              {files.length > 0 && (
                <button type="button" className={styles.btnGhost} onClick={clearList}>
                  Limpar lista
                </button>
              )}
            </div>
            <p className={styles.hint}>
              Até {limits.maxFiles} arquivos · {formatBytes(limits.maxFileBytes)} por arquivo · lote{" "}
              {formatBytes(limits.maxBatchBytes)}
            </p>
          </div>
        </section>

        <section className={styles.panel}>
          <h2>Configurações de conversão</h2>

          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Formato de origem</span>
              <select
                value={options.inputFormat}
                onChange={(e) => setInputFormat(e.target.value as InputFormatChoice)}
                disabled={busy}
              >
                <option value="auto">Automático (detectar)</option>
                {INPUT_FORMAT_CHOICES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Formato de saída</span>
              <select
                value={options.outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                disabled={busy}
              >
                {limits.enabledOutputFormats.map((f) => (
                  <option key={f} value={f}>
                    {OUTPUT_FORMAT_LABELS[f]}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.check}>
              <input
                type="checkbox"
                checked={usePerFileFormat}
                onChange={(e) => setUsePerFileFormat(e.target.checked)}
                disabled={busy}
              />
              Formatos de saída diferentes por arquivo
            </label>
          </div>

          <p className={styles.hint}>
            Ex.: origem JPEG e saída PNG. Em Automático, o sistema identifica o formato pelo conteúdo
            do arquivo.
          </p>

          {(options.outputFormat === "jpg" ||
            options.outputFormat === "webp" ||
            options.outputFormat === "avif") && (
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>Qualidade ({options.format.quality}%)</span>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={options.format.quality}
                  onChange={(e) =>
                    setOptions((p) => ({
                      ...p,
                      format: { ...p.format, quality: Number(e.target.value) },
                    }))
                  }
                />
              </label>
              {(options.outputFormat === "webp" || options.outputFormat === "avif") && (
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={options.format.lossless}
                    onChange={(e) =>
                      setOptions((p) => ({
                        ...p,
                        format: { ...p.format, lossless: e.target.checked },
                      }))
                    }
                  />
                  Sem perdas (lossless)
                </label>
              )}
            </div>
          )}

          {options.outputFormat === "png" && (
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>Compressão PNG ({options.format.pngCompressionLevel})</span>
                <input
                  type="range"
                  min={0}
                  max={9}
                  value={options.format.pngCompressionLevel}
                  onChange={(e) =>
                    setOptions((p) => ({
                      ...p,
                      format: { ...p.format, pngCompressionLevel: Number(e.target.value) },
                    }))
                  }
                />
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={options.format.preserveTransparency}
                  onChange={(e) =>
                    setOptions((p) => ({
                      ...p,
                      format: { ...p.format, preserveTransparency: e.target.checked },
                    }))
                  }
                />
                Preservar transparência
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={options.format.preserveMetadata}
                  onChange={(e) =>
                    setOptions((p) => ({
                      ...p,
                      format: {
                        ...p.format,
                        preserveMetadata: e.target.checked,
                        stripMetadata: !e.target.checked,
                      },
                    }))
                  }
                />
                Preservar metadados
              </label>
            </div>
          )}

          {(options.outputFormat === "webp" || options.outputFormat === "avif") && (
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={options.format.preserveTransparency}
                onChange={(e) =>
                  setOptions((p) => ({
                    ...p,
                    format: { ...p.format, preserveTransparency: e.target.checked },
                  }))
                }
              />
              Preservar transparência
            </label>
          )}

          {options.outputFormat === "jpg" && (
            <div className={styles.grid}>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={options.format.stripMetadata}
                  onChange={(e) =>
                    setOptions((p) => ({
                      ...p,
                      format: { ...p.format, stripMetadata: e.target.checked },
                    }))
                  }
                />
                Remover metadados
              </label>
            </div>
          )}

          {needsBackground && (
            <label className={styles.field}>
              <span>Cor de fundo (transparência)</span>
              <input
                type="color"
                value={options.format.background}
                onChange={(e) =>
                  setOptions((p) => ({
                    ...p,
                    format: { ...p.format, background: e.target.value },
                  }))
                }
              />
            </label>
          )}

          {options.outputFormat === "pdf" && (
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>Modo PDF</span>
                <select
                  value={options.format.pdfMode}
                  onChange={(e) =>
                    setOptions((p) => ({
                      ...p,
                      format: {
                        ...p.format,
                        pdfMode: e.target.value as "single" | "merged",
                      },
                    }))
                  }
                >
                  <option value="single">Uma imagem por PDF</option>
                  <option value="merged">Unir todas em um PDF</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Orientação</span>
                <select
                  value={options.format.pdfOrientation}
                  onChange={(e) =>
                    setOptions((p) => ({
                      ...p,
                      format: {
                        ...p.format,
                        pdfOrientation: e.target.value as "auto" | "portrait" | "landscape",
                      },
                    }))
                  }
                >
                  <option value="auto">Automática</option>
                  <option value="portrait">Retrato</option>
                  <option value="landscape">Paisagem</option>
                </select>
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={options.format.pdfFitToPage}
                  onChange={(e) =>
                    setOptions((p) => ({
                      ...p,
                      format: { ...p.format, pdfFitToPage: e.target.checked },
                    }))
                  }
                />
                Ajustar imagem à página
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={options.format.pdfPreserveAspect}
                  onChange={(e) =>
                    setOptions((p) => ({
                      ...p,
                      format: { ...p.format, pdfPreserveAspect: e.target.checked },
                    }))
                  }
                />
                Preservar proporção
              </label>
            </div>
          )}

          <h3 className={styles.subheading}>Redimensionamento</h3>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Modo</span>
              <select
                value={options.resize.mode}
                onChange={(e) =>
                  updateOptions("resize", {
                    ...options.resize,
                    mode: e.target.value as ConvertOptions["resize"]["mode"],
                  })
                }
              >
                <option value="original">Manter tamanho original</option>
                <option value="width">Definir largura</option>
                <option value="height">Definir altura</option>
                <option value="both">Definir largura e altura</option>
                <option value="fit">Ajustar (caber)</option>
              </select>
            </label>
            {(options.resize.mode === "width" ||
              options.resize.mode === "both" ||
              options.resize.mode === "fit") && (
              <label className={styles.field}>
                <span>Largura (px)</span>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={options.resize.width || ""}
                  onChange={(e) =>
                    updateOptions("resize", {
                      ...options.resize,
                      width: Number(e.target.value) || undefined,
                    })
                  }
                />
              </label>
            )}
            {(options.resize.mode === "height" ||
              options.resize.mode === "both" ||
              options.resize.mode === "fit") && (
              <label className={styles.field}>
                <span>Altura (px)</span>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={options.resize.height || ""}
                  onChange={(e) =>
                    updateOptions("resize", {
                      ...options.resize,
                      height: Number(e.target.value) || undefined,
                    })
                  }
                />
              </label>
            )}
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={options.resize.keepAspectRatio}
                onChange={(e) =>
                  updateOptions("resize", {
                    ...options.resize,
                    keepAspectRatio: e.target.checked,
                  })
                }
              />
              Manter proporção
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={options.resize.withoutEnlargement}
                onChange={(e) =>
                  updateOptions("resize", {
                    ...options.resize,
                    withoutEnlargement: e.target.checked,
                  })
                }
              />
              Não ampliar imagens menores
            </label>
          </div>
        </section>

        {files.length > 0 && (
          <section className={styles.panel}>
            <div className={styles.listHeader}>
              <h2>
                Arquivos ({files.length}) · {formatBytes(totalBytes)}
              </h2>
              <div className={styles.actions}>
                {!busy ? (
                  <>
                    <button type="button" className={styles.btnPrimary} onClick={() => void runQueue(false)}>
                      Converter imagens
                    </button>
                    {errorCount > 0 && (
                      <button type="button" className={styles.btnSecondary} onClick={() => void runQueue(true)}>
                        Converter novamente
                      </button>
                    )}
                    {doneCount > 0 && (
                      <button type="button" className={styles.btnSecondary} onClick={() => void downloadZip()}>
                        Baixar todas em ZIP
                      </button>
                    )}
                  </>
                ) : (
                  <button type="button" className={styles.btnDanger} onClick={cancel}>
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {busy && (
              <div className={styles.progressBlock}>
                <div className={styles.progressLabel}>Progresso geral: {globalProgress}%</div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${globalProgress}%` }} />
                </div>
              </div>
            )}

            {options.outputFormat === "pdf" && options.format.pdfMode === "merged" && (
              <div className={styles.pdfOrder}>
                <h3>Ordem das páginas</h3>
                <ul>
                  {pdfOrder.map((id) => {
                    const f = files.find((x) => x.id === id);
                    if (!f) return null;
                    return (
                      <li key={id}>
                        <span>{f.name}</span>
                        <span>
                          <button type="button" onClick={() => movePdfOrder(id, -1)} disabled={busy}>
                            ↑
                          </button>
                          <button type="button" onClick={() => movePdfOrder(id, 1)} disabled={busy}>
                            ↓
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <ul className={styles.fileList}>
              {files.map((f) => {
                const delta =
                  f.resultSize && f.size ? sizeDeltaPercent(f.size, f.resultSize) : null;
                return (
                  <li key={f.id} className={styles.fileCard}>
                    <div className={styles.thumb}>
                      {f.resultPreviewUrl || f.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={f.resultPreviewUrl || f.previewUrl}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <div className={styles.thumbPlaceholder}>
                          {(f.sourceFormat || f.detectedFormat || "?").toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className={styles.fileMeta}>
                      <strong title={f.name}>{f.name}</strong>
                      <span>
                        {f.sourceFormat
                          ? INPUT_FORMAT_LABELS[f.sourceFormat]
                          : f.detectedFormat
                            ? INPUT_FORMAT_LABELS[f.detectedFormat]
                            : "Desconhecido"}
                        {f.width && f.height ? ` · ${f.width}×${f.height}` : ""}
                        {` · ${formatBytes(f.size)}`}
                      </span>
                      {usePerFileFormat && (f.sourceFormat || f.detectedFormat) && (
                        <label className={styles.inlineSelect}>
                          Converter para
                          <select
                            value={f.outputFormat || options.outputFormat}
                            onChange={(e) => setFileOutput(f.id, e.target.value as OutputFormat)}
                            disabled={busy}
                          >
                            {limits.enabledOutputFormats.map((fmt) => (
                              <option key={fmt} value={fmt}>
                                {OUTPUT_FORMAT_LABELS[fmt]}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <div className={styles.statusLine}>
                        <span className={styles[`st_${f.status}`] || ""}>
                          {statusLabel(f.status)}
                          {f.status === "converting" ? ` ${f.progress}%` : ""}
                        </span>
                        {f.error && <span className={styles.errorText}>{f.error}</span>}
                      </div>
                      {f.status === "done" && (
                        <div className={styles.compare}>
                          <span>
                            {(f.sourceFormat || f.detectedFormat || "?").toUpperCase()} →{" "}
                            {(f.outputFormat || options.outputFormat).toUpperCase()}
                          </span>
                          <span>
                            {formatBytes(f.size)} → {formatBytes(f.resultSize || 0)}
                            {delta !== null ? ` (${delta > 0 ? "+" : ""}${delta}%)` : ""}
                          </span>
                          {f.width && f.resultWidth && (
                            <span>
                              {f.width}×{f.height} → {f.resultWidth}×{f.resultHeight}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className={styles.fileActions}>
                      {f.status === "done" && f.resultId && (
                        <button
                          type="button"
                          className={styles.btnPrimary}
                          onClick={() => downloadOne(f.resultId!, f.resultName)}
                        >
                          Baixar resultado
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.btnGhost}
                        onClick={() => removeFile(f.id)}
                        disabled={busy}
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <span>
          Processamento no servidor para HEIC, TIFF, AVIF e PDF · Orientação EXIF corrigida
          automaticamente
        </span>
        <span>
          {readyCount} prontos · {doneCount} concluídos · {errorCount} com erro
        </span>
      </footer>

      {toast && (
        <div className={styles.toast} role="alert">
          {toast}
        </div>
      )}
    </div>
  );
}

function statusLabel(status: QueuedFile["status"]) {
  switch (status) {
    case "ready":
      return "Pronto";
    case "converting":
      return "Convertendo";
    case "done":
      return "Concluído";
    case "error":
      return "Falhou";
    case "cancelled":
      return "Cancelado";
    case "validating":
      return "Validando";
    default:
      return "Pendente";
  }
}
