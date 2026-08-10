"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { defaultConvertOptions } from "@/lib/formats";
import { withBasePath } from "@/lib/base-path";
import { formatBytes } from "@/lib/limits";
import { UserMessages } from "@/lib/errors";
import { loadPdfjs } from "@/lib/pdfjs-client";
import styles from "./PdfImageApp.module.css";

export type PdfImageMode = "jpg-to-pdf" | "pdf-to-jpg";

type QueuedItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  status: "ready" | "working" | "done" | "error";
  error?: string;
  resultUrl?: string;
  resultName?: string;
  resultSize?: number;
  pages?: number;
};

function uid() {
  return crypto.randomUUID();
}

export default function PdfImageApp({ mode }: { mode: PdfImageMode }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<QueuedItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [mergePdf, setMergePdf] = useState(true);
  const [quality, setQuality] = useState(0.92);

  const isJpgToPdf = mode === "jpg-to-pdf";
  const accept = isJpgToPdf
    ? ".jpg,.jpeg,.png,.webp,.bmp,.gif,.tif,.tiff,image/*"
    : ".pdf,application/pdf";
  const title = isJpgToPdf ? "JPG para PDF" : "PDF para JPG";
  const subtitle = isJpgToPdf
    ? "Envie imagens e gere um PDF. Você pode unir tudo em um único arquivo."
    : "Envie PDFs e exporte cada página como imagem JPG.";

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const addFiles = async (list: FileList | File[]) => {
    const incoming = Array.from(list);
    if (!incoming.length) return;

    const next: QueuedItem[] = [];
    for (const file of incoming) {
      const ok = isJpgToPdf
        ? file.type.startsWith("image/") || /\.(jpe?g|png|webp|bmp|gif|tiff?)$/i.test(file.name)
        : file.type === "application/pdf" || /\.pdf$/i.test(file.name);

      next.push({
        id: uid(),
        file,
        name: file.name,
        size: file.size,
        status: ok ? "ready" : "error",
        error: ok
          ? undefined
          : isJpgToPdf
            ? "Envie apenas imagens (JPG, PNG, WEBP…)."
            : "Envie apenas arquivos PDF.",
      });
    }
    setItems((prev) => [...prev, ...next]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.resultUrl) URL.revokeObjectURL(target.resultUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const clearAll = () => {
    items.forEach((i) => {
      if (i.resultUrl) URL.revokeObjectURL(i.resultUrl);
    });
    setItems([]);
  };

  const update = (id: string, patch: Partial<QueuedItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const convertJpgToPdf = async () => {
    const valid = items.filter((i) => i.status === "ready");
    if (!valid.length) {
      showToast("Adicione imagens válidas para converter.");
      return;
    }

    setBusy(true);
    try {
      if (mergePdf) {
        valid.forEach((i) => update(i.id, { status: "working", error: undefined }));
        const form = new FormData();
        form.append("mode", "merged-pdf");
        const options = defaultConvertOptions("pdf");
        options.format.pdfMode = "merged";
        form.append("options", JSON.stringify(options));
        form.append("order", JSON.stringify(valid.map((i) => i.id)));
        form.append("fileIds", JSON.stringify(valid.map((i) => i.id)));
        valid.forEach((i) => form.append("files", i.file, i.name));

        const res = await fetch(withBasePath("/api/convert"), { method: "POST", body: form });
        const data = await res.json();
        if (!data.ok) {
          valid.forEach((i) => update(i.id, { status: "error", error: data.error }));
          showToast(data.error || UserMessages.convertFailed);
          return;
        }

        const blobRes = await fetch(withBasePath(`/api/download/${data.resultId}`));
        const blob = await blobRes.blob();
        const url = URL.createObjectURL(blob);
        const firstId = valid[0].id;

        setItems((prev) =>
          prev.map((i) =>
            valid.some((v) => v.id === i.id)
              ? {
                  ...i,
                  status: "done",
                  resultUrl: i.id === firstId ? url : undefined,
                  resultName: data.fileName,
                  resultSize: data.size,
                  error: undefined,
                }
              : i,
          ),
        );
        return;
      }

      for (const item of valid) {
        update(item.id, { status: "working", error: undefined });
        const form = new FormData();
        form.append("file", item.file, item.name);
        const options = defaultConvertOptions("pdf");
        options.format.pdfMode = "single";
        form.append("options", JSON.stringify(options));
        form.append("outputFormat", "pdf");
        const res = await fetch(withBasePath("/api/convert"), { method: "POST", body: form });
        const data = await res.json();
        if (!data.ok) {
          update(item.id, { status: "error", error: data.error });
          continue;
        }
        const blobRes = await fetch(withBasePath(`/api/download/${data.resultId}`));
        const blob = await blobRes.blob();
        update(item.id, {
          status: "done",
          resultUrl: URL.createObjectURL(blob),
          resultName: data.fileName,
          resultSize: data.size,
        });
      }
    } catch {
      showToast(UserMessages.network);
    } finally {
      setBusy(false);
    }
  };

  const convertPdfToJpg = async () => {
    const valid = items.filter((i) => i.status === "ready");
    if (!valid.length) {
      showToast("Adicione arquivos PDF para converter.");
      return;
    }

    setBusy(true);
    try {
      const pdfjs = await loadPdfjs();

      for (const item of valid) {
        update(item.id, { status: "working", error: undefined });
        try {
          const data = new Uint8Array(await item.file.arrayBuffer());
          const doc = await pdfjs.getDocument({ data }).promise;
          const zip = new JSZip();
          const pageCount = doc.numPages;

          for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
            const page = await doc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement("canvas");
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("canvas");
            const renderTask = page.render({
              canvasContext: ctx,
              viewport,
              canvas,
            });
            await renderTask.promise;
            const blob: Blob | null = await new Promise((resolve) =>
              canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
            );
            if (!blob) throw new Error("blob");
            const base = item.name.replace(/\.pdf$/i, "") || "pagina";
            zip.file(`${base}-p${String(pageNum).padStart(2, "0")}.jpg`, blob);
            canvas.width = 0;
            canvas.height = 0;
          }

          const zipBlob = await zip.generateAsync({ type: "blob" });
          update(item.id, {
            status: "done",
            resultUrl: URL.createObjectURL(zipBlob),
            resultName: `${item.name.replace(/\.pdf$/i, "") || "pdf"}-paginas.zip`,
            resultSize: zipBlob.size,
            pages: pageCount,
          });
        } catch {
          update(item.id, {
            status: "error",
            error:
              "Não foi possível ler este PDF. Verifique se o arquivo não está corrompido ou protegido.",
          });
        }
      }
    } catch {
      showToast(UserMessages.convertFailed);
    } finally {
      setBusy(false);
    }
  };

  const doneCount = useMemo(() => items.filter((i) => i.status === "done").length, [items]);

  return (
    <div className={styles.shell}>
      <div className={styles.intro}>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <main className={styles.main}>
        <section
          className={`${styles.dropzone} ${dragOver ? styles.dropActive : ""}`}
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
            accept={accept}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <strong>{isJpgToPdf ? "Arraste imagens aqui" : "Arraste PDFs aqui"}</strong>
          <span>ou clique para selecionar arquivos</span>
          <div className={styles.actions}>
            <button type="button" className={styles.btnPrimary} onClick={() => inputRef.current?.click()}>
              {items.length ? "Adicionar arquivos" : "Selecionar arquivos"}
            </button>
            {items.length > 0 && (
              <button type="button" className={styles.btnGhost} onClick={clearAll} disabled={busy}>
                Limpar lista
              </button>
            )}
          </div>
        </section>

        {isJpgToPdf ? (
          <section className={styles.panel}>
            <h2>Opções</h2>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={mergePdf}
                onChange={(e) => setMergePdf(e.target.checked)}
                disabled={busy}
              />
              Unir todas as imagens em um único PDF
            </label>
          </section>
        ) : (
          <section className={styles.panel}>
            <h2>Opções</h2>
            <label className={styles.field}>
              <span>Qualidade JPG ({Math.round(quality * 100)}%)</span>
              <input
                type="range"
                min={0.5}
                max={1}
                step={0.01}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                disabled={busy}
              />
            </label>
          </section>
        )}

        {items.length > 0 && (
          <section className={styles.panel}>
            <div className={styles.listHead}>
              <h2>
                Arquivos ({items.length})
                {doneCount > 0 ? ` · ${doneCount} prontos` : ""}
              </h2>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => (isJpgToPdf ? void convertJpgToPdf() : void convertPdfToJpg())}
                disabled={busy}
              >
                {busy ? "Convertendo…" : "Converter"}
              </button>
            </div>
            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong title={item.name}>{item.name}</strong>
                    <span>
                      {formatBytes(item.size)}
                      {item.pages ? ` · ${item.pages} páginas` : ""}
                      {item.resultSize ? ` → ${formatBytes(item.resultSize)}` : ""}
                      {` · ${statusLabel(item.status)}`}
                    </span>
                    {item.error && <span className={styles.error}>{item.error}</span>}
                  </div>
                  <div className={styles.rowActions}>
                    {item.status === "done" && item.resultUrl && (
                      <a className={styles.btnPrimary} href={item.resultUrl} download={item.resultName}>
                        Baixar resultado
                      </a>
                    )}
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() => removeItem(item.id)}
                      disabled={busy}
                    >
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {toast && (
        <div className={styles.toast} role="alert">
          {toast}
        </div>
      )}
    </div>
  );
}

function statusLabel(status: QueuedItem["status"]) {
  switch (status) {
    case "ready":
      return "Pronto";
    case "working":
      return "Convertendo";
    case "done":
      return "Concluído";
    case "error":
      return "Erro";
    default:
      return status;
  }
}
