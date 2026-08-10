"use client";

import { useMemo, useRef, useState } from "react";
import type { ToolCard } from "@/lib/tools";
import { withBasePath } from "@/lib/base-path";
import { formatBytes } from "@/lib/limits";
import { UserMessages } from "@/lib/errors";
import styles from "./ToolWorkbench.module.css";

type Props = { tool: ToolCard };

type Item = {
  id: string;
  file: File;
  name: string;
  size: number;
};

export default function ToolWorkbench({ tool }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const signRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [signature, setSignature] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [result, setResult] = useState<{
    url: string;
    name: string;
    size: number;
  } | null>(null);

  // Options
  const [ranges, setRanges] = useState("1-1");
  const [splitMode, setSplitMode] = useState<"pages" | "range">("pages");
  const [degrees, setDegrees] = useState<90 | 180 | 270>(90);
  const [level, setLevel] = useState<"low" | "medium" | "high">("medium");
  const [watermark, setWatermark] = useState("MITI");
  const [password, setPassword] = useState("");
  const [htmlText, setHtmlText] = useState("");
  const [deletePages, setDeletePages] = useState("");
  const [pageOrder, setPageOrder] = useState("");
  const [editText, setEditText] = useState("");
  const [signAllPages, setSignAllPages] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4200);
  };

  const addFiles = (list: FileList | File[]) => {
    const incoming = Array.from(list).map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      size: file.size,
    }));
    setItems((prev) => (tool.multiple ? [...prev, ...incoming] : incoming.slice(0, 1)));
  };

  const clear = () => {
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
    setItems([]);
    setSignature(null);
  };

  const options = useMemo(() => {
    const o: Record<string, unknown> = {};
    switch (tool.kind) {
      case "pdf-split":
        o.splitMode = splitMode;
        o.ranges = ranges;
        break;
      case "pdf-rotate":
        o.degrees = degrees;
        break;
      case "pdf-compress":
        o.level = level;
        break;
      case "pdf-watermark":
        o.text = watermark;
        break;
      case "pdf-protect":
      case "pdf-unlock":
        o.password = password;
        break;
      case "pdf-edit":
        o.deletePages = deletePages;
        o.pageOrder = pageOrder;
        o.text = editText;
        o.page = 1;
        o.x = 48;
        o.y = 48;
        o.fontSize = 14;
        break;
      case "pdf-sign":
        o.allPages = signAllPages;
        break;
      default:
        break;
    }
    return o;
  }, [
    tool.kind,
    splitMode,
    ranges,
    degrees,
    level,
    watermark,
    password,
    deletePages,
    pageOrder,
    editText,
    signAllPages,
  ]);

  const run = async () => {
    if (!items.length && !(tool.kind === "html-to-pdf" && htmlText.trim())) {
      showToast("Adicione arquivos para processar.");
      return;
    }

    setBusy(true);
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);

    try {
      const form = new FormData();
      form.append("kind", tool.kind);
      form.append("options", JSON.stringify(options));
      items.forEach((i) => form.append("files", i.file, i.name));
      if (tool.kind === "html-to-pdf" && htmlText.trim()) {
        form.append("htmlText", htmlText);
      }
      if (tool.kind === "pdf-sign") {
        if (!signature) {
          showToast("Envie a imagem da assinatura (PNG ou JPG).");
          setBusy(false);
          return;
        }
        form.append("signature", signature, signature.name);
      }

      const res = await fetch(withBasePath("/api/tools"), { method: "POST", body: form });
      const data = await res.json();
      if (!data.ok) {
        showToast(data.error || UserMessages.convertFailed);
        return;
      }

      const blobRes = await fetch(withBasePath(`/api/download/${data.resultId}`));
      if (!blobRes.ok) {
        showToast(UserMessages.notFound);
        return;
      }
      const blob = await blobRes.blob();
      setResult({
        url: URL.createObjectURL(blob),
        name: data.fileName,
        size: data.size || blob.size,
      });
    } catch {
      showToast(UserMessages.network);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.shell}>
      <div className={styles.intro}>
        <h1>{tool.title}</h1>
        <p>{tool.description}</p>
      </div>

      <main className={styles.main}>
        <section
          className={`${styles.drop} ${dragOver ? styles.dropActive : ""}`}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={tool.accept}
            multiple={tool.multiple}
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <strong>Arraste arquivos aqui</strong>
          <span>ou selecione no dispositivo</span>
          <div className={styles.row}>
            <button type="button" className={styles.primary} onClick={() => inputRef.current?.click()}>
              Selecionar arquivos
            </button>
            {items.length > 0 && (
              <button type="button" className={styles.ghost} onClick={clear} disabled={busy}>
                Limpar
              </button>
            )}
          </div>
        </section>

        {tool.kind === "pdf-split" && (
          <section className={styles.panel}>
            <h2>Opções de divisão</h2>
            <label className={styles.field}>
              <span>Modo</span>
              <select
                value={splitMode}
                onChange={(e) => setSplitMode(e.target.value as "pages" | "range")}
              >
                <option value="pages">Uma página por arquivo</option>
                <option value="range">Intervalo de páginas</option>
              </select>
            </label>
            {splitMode === "range" && (
              <label className={styles.field}>
                <span>Páginas (ex.: 1-3,5)</span>
                <input value={ranges} onChange={(e) => setRanges(e.target.value)} />
              </label>
            )}
          </section>
        )}

        {tool.kind === "pdf-rotate" && (
          <section className={styles.panel}>
            <h2>Rotação</h2>
            <label className={styles.field}>
              <span>Ângulo</span>
              <select
                value={degrees}
                onChange={(e) => setDegrees(Number(e.target.value) as 90 | 180 | 270)}
              >
                <option value={90}>90°</option>
                <option value={180}>180°</option>
                <option value={270}>270°</option>
              </select>
            </label>
          </section>
        )}

        {tool.kind === "pdf-compress" && (
          <section className={styles.panel}>
            <h2>Nível de compressão</h2>
            <label className={styles.field}>
              <span>Nível</span>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as "low" | "medium" | "high")}
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
            </label>
          </section>
        )}

        {tool.kind === "pdf-watermark" && (
          <section className={styles.panel}>
            <h2>Marca d&apos;água</h2>
            <label className={styles.field}>
              <span>Texto</span>
              <input value={watermark} onChange={(e) => setWatermark(e.target.value)} />
            </label>
          </section>
        )}

        {(tool.kind === "pdf-protect" || tool.kind === "pdf-unlock") && (
          <section className={styles.panel}>
            <h2>Senha</h2>
            <label className={styles.field}>
              <span>{tool.kind === "pdf-protect" ? "Nova senha" : "Senha atual"}</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
          </section>
        )}

        {tool.kind === "html-to-pdf" && (
          <section className={styles.panel}>
            <h2>HTML (opcional)</h2>
            <textarea
              className={styles.area}
              rows={8}
              placeholder="Cole HTML aqui se preferir não enviar arquivo…"
              value={htmlText}
              onChange={(e) => setHtmlText(e.target.value)}
            />
          </section>
        )}

        {tool.kind === "pdf-edit" && (
          <section className={styles.panel}>
            <h2>Edição</h2>
            <label className={styles.field}>
              <span>Excluir páginas (ex.: 2,4)</span>
              <input value={deletePages} onChange={(e) => setDeletePages(e.target.value)} />
            </label>
            <label className={styles.field}>
              <span>Nova ordem (ex.: 3,1,2)</span>
              <input value={pageOrder} onChange={(e) => setPageOrder(e.target.value)} />
            </label>
            <label className={styles.field}>
              <span>Texto a inserir (página 1)</span>
              <input value={editText} onChange={(e) => setEditText(e.target.value)} />
            </label>
          </section>
        )}

        {tool.kind === "pdf-sign" && (
          <section className={styles.panel}>
            <h2>Assinatura</h2>
            <input
              ref={signRef}
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              hidden
              onChange={(e) => setSignature(e.target.files?.[0] || null)}
            />
            <div className={styles.row}>
              <button type="button" className={styles.ghost} onClick={() => signRef.current?.click()}>
                {signature ? signature.name : "Escolher imagem da assinatura"}
              </button>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={signAllPages}
                  onChange={(e) => setSignAllPages(e.target.checked)}
                />
                Aplicar em todas as páginas
              </label>
            </div>
          </section>
        )}

        {items.length > 0 && (
          <section className={styles.panel}>
            <div className={styles.listHead}>
              <h2>Arquivos ({items.length})</h2>
              <button type="button" className={styles.primary} onClick={() => void run()} disabled={busy}>
                {busy ? "Processando…" : "Executar"}
              </button>
            </div>
            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item.id}>
                  <span title={item.name}>{item.name}</span>
                  <span>{formatBytes(item.size)}</span>
                  <button
                    type="button"
                    className={styles.ghost}
                    disabled={busy}
                    onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!items.length && tool.kind === "html-to-pdf" && htmlText.trim() && (
          <div className={styles.row}>
            <button type="button" className={styles.primary} onClick={() => void run()} disabled={busy}>
              {busy ? "Processando…" : "Converter HTML"}
            </button>
          </div>
        )}

        {result && (
          <section className={`${styles.panel} ${styles.result}`}>
            <h2>Resultado pronto</h2>
            <p>
              {result.name} · {formatBytes(result.size)}
            </p>
            <a className={styles.primary} href={result.url} download={result.name}>
              Baixar resultado
            </a>
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
