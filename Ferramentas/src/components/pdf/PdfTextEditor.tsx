"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UserMessages } from "@/lib/errors";
import { withBasePath } from "@/lib/base-path";
import { formatBytes } from "@/lib/limits";
import { loadPdfjs } from "@/lib/pdfjs-client";
import styles from "./PdfTextEditor.module.css";

type TextSpan = {
  id: string;
  pageIndex: number;
  /** PDF user space (origin bottom-left) */
  pdfX: number;
  pdfY: number;
  pdfWidth: number;
  pdfHeight: number;
  fontSize: number;
  /** CSS overlay inside page (origin top-left) */
  left: number;
  top: number;
  width: number;
  height: number;
  original: string;
  value: string;
};

type PageView = {
  pageIndex: number;
  width: number;
  height: number;
  dataUrl: string;
};

const RENDER_SCALE = 1.35;

function mergeLineItems(
  items: Array<{
    str: string;
    pdfX: number;
    pdfY: number;
    pdfWidth: number;
    fontSize: number;
    left: number;
    top: number;
    width: number;
    height: number;
  }>,
  pageIndex: number,
): TextSpan[] {
  const sorted = [...items].sort((a, b) => {
    const dy = b.pdfY - a.pdfY;
    if (Math.abs(dy) > 2) return dy;
    return a.pdfX - b.pdfX;
  });

  const lines: typeof sorted[] = [];
  for (const item of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last[0].pdfY - item.pdfY) <= Math.max(2, item.fontSize * 0.35)) {
      last.push(item);
    } else {
      lines.push([item]);
    }
  }

  return lines.map((line, idx) => {
    line.sort((a, b) => a.pdfX - b.pdfX);
    const first = line[0];
    const last = line[line.length - 1];
    const text = line.map((p) => p.str).join("").replace(/\s+/g, " ").trim();
    const pdfWidth = Math.max(
      last.pdfX + last.pdfWidth - first.pdfX,
      line.reduce((sum, p) => sum + p.pdfWidth, 0),
    );
    const left = Math.min(...line.map((p) => p.left));
    const top = Math.min(...line.map((p) => p.top));
    const right = Math.max(...line.map((p) => p.left + p.width));
    const bottom = Math.max(...line.map((p) => p.top + p.height));
    const fontSize = Math.max(...line.map((p) => p.fontSize));

    return {
      id: `p${pageIndex}-l${idx}`,
      pageIndex,
      pdfX: first.pdfX,
      pdfY: first.pdfY,
      pdfWidth,
      pdfHeight: fontSize * 1.2,
      fontSize,
      left,
      top,
      width: Math.max(24, right - left),
      height: Math.max(14, bottom - top),
      original: text,
      value: text,
    };
  }).filter((span) => span.original.length > 0);
}

export default function PdfTextEditor() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageView[]>([]);
  const [spans, setSpans] = useState<TextSpan[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4200);
  };

  const dirtyCount = useMemo(
    () => spans.filter((s) => s.value !== s.original).length,
    [spans],
  );

  const clear = () => {
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
    setFile(null);
    setPages([]);
    setSpans([]);
    setActiveId(null);
  };

  const loadPdf = useCallback(async (pdfFile: File) => {
    setLoading(true);
    setResult(null);
    setActiveId(null);
    try {
      const pdfjs = await loadPdfjs();

      const bytes = new Uint8Array(await pdfFile.arrayBuffer());
      const doc = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
      const nextPages: PageView[] = [];
      const nextSpans: TextSpan[] = [];

      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas");

        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        nextPages.push({
          pageIndex: pageNum - 1,
          width: canvas.width,
          height: canvas.height,
          dataUrl: canvas.toDataURL("image/png"),
        });

        const textContent = await page.getTextContent();
        const raw: Parameters<typeof mergeLineItems>[0] = [];

        for (const item of textContent.items) {
          if (!("str" in item) || typeof item.str !== "string" || !item.str.trim()) continue;
          const transform = pdfjs.Util.transform(viewport.transform, item.transform);
          const fontSize = Math.hypot(transform[2], transform[3]);
          const left = transform[4];
          const bottom = transform[5];
          const top = bottom - fontSize;
          const width = (item.width || 0) * viewport.scale;
          const pdfFontSize = Math.hypot(item.transform[2], item.transform[3]) || fontSize / RENDER_SCALE;

          raw.push({
            str: item.str,
            pdfX: item.transform[4],
            pdfY: item.transform[5],
            pdfWidth: item.width || pdfFontSize * item.str.length * 0.5,
            fontSize: pdfFontSize,
            left,
            top,
            width: Math.max(width, fontSize * 0.4),
            height: Math.max(fontSize * 1.15, 12),
          });
        }

        nextSpans.push(...mergeLineItems(raw, pageNum - 1));
        canvas.width = 0;
        canvas.height = 0;
      }

      setFile(pdfFile);
      setPages(nextPages);
      setSpans(nextSpans);

      if (!nextSpans.length) {
        showToast(
          "Nenhum texto editável encontrado. PDFs escaneados (imagem) não permitem edição de texto.",
        );
      }
    } catch (error) {
      console.error("[editar-pdf] falha ao abrir PDF", error);
      setFile(null);
      setPages([]);
      setSpans([]);
      setActiveId(null);
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("password") || message.includes("encrypted")) {
        showToast(UserMessages.pdfPasswordRequired);
      } else if (message.includes("worker") || message.includes("fetch") || message.includes("dynamically imported")) {
        showToast("Falha ao carregar o motor de PDF. Recarregue a página e tente novamente.");
      } else {
        showToast(UserMessages.pdfInvalid);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const onPick = (list: FileList | File[] | null) => {
    const picked = list?.[0];
    if (!picked) return;
    if (!/\.pdf$/i.test(picked.name) && picked.type !== "application/pdf") {
      showToast("Envie um arquivo PDF.");
      return;
    }
    void loadPdf(picked);
  };

  const updateSpan = (id: string, value: string) => {
    setSpans((prev) => prev.map((s) => (s.id === id ? { ...s, value } : s)));
  };

  const save = async () => {
    if (!file) {
      showToast("Envie um PDF para editar.");
      return;
    }
    const edits = spans
      .filter((s) => s.value !== s.original)
      .map((s) => ({
        pageIndex: s.pageIndex,
        x: s.pdfX,
        y: s.pdfY,
        width: s.pdfWidth,
        height: s.pdfHeight,
        fontSize: s.fontSize,
        text: s.value,
      }));

    if (!edits.length) {
      showToast("Altere algum texto antes de salvar.");
      return;
    }

    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("edits", JSON.stringify(edits));
      const res = await fetch(withBasePath("/api/pdf/text-edit"), { method: "POST", body: form });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        resultId?: string;
        fileName?: string;
      };
      if (!res.ok || !data.ok || !data.resultId) {
        showToast(data.error || UserMessages.pdfEditFailed);
        return;
      }

      const dl = await fetch(withBasePath(`/api/download/${data.resultId}`));
      if (!dl.ok) {
        showToast(UserMessages.notFound);
        return;
      }
      const blob = await dl.blob();
      if (result?.url) URL.revokeObjectURL(result.url);
      setResult({
        url: URL.createObjectURL(blob),
        name: data.fileName || "editado.pdf",
        size: blob.size,
      });
      showToast("PDF editado com sucesso.");
    } catch {
      showToast(UserMessages.network);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    return () => {
      if (result?.url) URL.revokeObjectURL(result.url);
    };
  }, [result?.url]);

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h1>Editar PDF</h1>
          <p>
            Abra o PDF, clique em um trecho de texto para editar e salve as alterações.
            Em PDFs escaneados (só imagem) o texto não é detectado.
          </p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={() => inputRef.current?.click()} disabled={busy || loading}>
            {file ? "Trocar PDF" : "Selecionar PDF"}
          </button>
          <button type="button" className={styles.secondary} onClick={clear} disabled={busy || loading || !file}>
            Limpar
          </button>
          <button type="button" className={styles.primary} onClick={() => void save()} disabled={busy || loading || !file || dirtyCount === 0}>
            {busy ? "Salvando…" : dirtyCount ? `Salvar (${dirtyCount})` : "Salvar"}
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          hidden
          onChange={(e) => {
            onPick(e.target.files);
            e.target.value = "";
          }}
        />
      </header>

      {!file && !loading && (
        <div
          className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onPick(e.dataTransfer.files);
          }}
        >
          <p>Arraste um PDF aqui ou selecione no dispositivo</p>
          <button type="button" className={styles.primary} onClick={() => inputRef.current?.click()}>
            Selecionar PDF
          </button>
        </div>
      )}

      {loading && <p className={styles.status}>Carregando PDF e extraindo texto…</p>}

      {file && pages.length > 0 && (
        <div className={styles.workspace}>
          <aside className={styles.side}>
            <h2>{file.name}</h2>
            <p>{formatBytes(file.size)} · {pages.length} página(s)</p>
            <p className={styles.hint}>
              {spans.length
                ? `${spans.length} trechos de texto detectados. Clique para editar.`
                : "Sem texto selecionável neste PDF."}
            </p>
            {result && (
              <a className={styles.download} href={result.url} download={result.name}>
                Baixar {result.name} ({formatBytes(result.size)})
              </a>
            )}
          </aside>

          <div className={styles.pages}>
            {pages.map((page) => (
              <section key={page.pageIndex} className={styles.pageCard}>
                <div className={styles.pageLabel}>Página {page.pageIndex + 1}</div>
                <div className={styles.pageStage} style={{ width: page.width, height: page.height }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={page.dataUrl} alt={`Página ${page.pageIndex + 1}`} className={styles.pageImage} draggable={false} />
                  {spans
                    .filter((s) => s.pageIndex === page.pageIndex)
                    .map((span) => {
                      const dirty = span.value !== span.original;
                      const active = activeId === span.id;
                      return (
                        <textarea
                          key={span.id}
                          className={`${styles.textBox} ${dirty ? styles.textDirty : ""} ${active ? styles.textActive : ""}`}
                          style={{
                            left: span.left,
                            top: span.top,
                            width: Math.max(span.width, 40),
                            height: Math.max(span.height, 16),
                            fontSize: Math.max(10, span.fontSize * RENDER_SCALE * 0.92),
                          }}
                          value={span.value}
                          spellCheck={false}
                          onFocus={() => setActiveId(span.id)}
                          onBlur={() => setActiveId((id) => (id === span.id ? null : id))}
                          onChange={(e) => updateSpan(span.id, e.target.value)}
                          title="Clique para editar este texto"
                        />
                      );
                    })}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
