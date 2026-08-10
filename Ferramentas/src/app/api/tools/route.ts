import { NextResponse } from "next/server";
import {
  mergePdfs,
  splitPdf,
  rotatePdf,
  watermarkPdf,
  compressPdf,
  protectPdf,
  unlockPdf,
  wordToPdf,
  excelToPdf,
  pptToPdf,
  pdfToWord,
  pdfToExcel,
  pdfToPpt,
  htmlToPdf,
  reorderPages,
  deletePages,
  addText,
  signPdf,
} from "@/services/pdf";
import { AppError, logTechnical, toUserError, UserMessages } from "@/lib/errors";
import { DEFAULT_LIMITS } from "@/lib/limits";
import { sanitizeFileName, isDangerousFileName } from "@/lib/sanitize";
import { createWorkDir, saveResult, startCleanupScheduler } from "@/services/storage";
import type { ToolKind } from "@/lib/tools";
import path from "path";
import fs from "fs/promises";
import JSZip from "jszip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

startCleanupScheduler();

type Saved = {
  resultId: string;
  fileName: string;
  mime: string;
  size: number;
};

async function persist(buffer: Buffer, fileName: string, mime: string): Promise<Saved> {
  const { id, dir } = await createWorkDir();
  const safe = sanitizeFileName(fileName);
  const filePath = path.join(dir, safe);
  await fs.writeFile(filePath, buffer);
  await saveResult({
    id,
    filePath,
    fileName: safe,
    mime,
    size: buffer.byteLength,
    width: 0,
    height: 0,
    inputFormat: "bin",
    outputFormat: path.extname(safe).replace(".", "") || "bin",
  });
  return { resultId: id, fileName: safe, mime, size: buffer.byteLength };
}

async function persistZip(
  files: Array<{ name: string; buffer: Buffer }>,
  zipName: string,
): Promise<Saved> {
  const zip = new JSZip();
  for (const f of files) zip.file(sanitizeFileName(f.name), f.buffer);
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return persist(buffer, zipName, "application/zip");
}

function parseOptions(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function mapOneOrZip(
  items: Array<{ name: string; buffer: Buffer }>,
  zipName: string,
  mimeSingle: string,
): Promise<Saved> {
  if (items.length === 1) return persist(items[0].buffer, items[0].name, mimeSingle);
  return persistZip(items, zipName);
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const kind = String(form.get("kind") || "") as ToolKind;
    const options = parseOptions(form.get("options")?.toString() || null);
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    const signature = form.get("signature");

    if (!kind) {
      return NextResponse.json(
        { ok: false, error: "Ferramenta não informada.", code: "NO_TOOL" },
        { status: 400 },
      );
    }

    if (!files.length && kind !== "html-to-pdf") {
      return NextResponse.json(
        { ok: false, error: "Envie ao menos um arquivo.", code: "EMPTY" },
        { status: 400 },
      );
    }

    if (files.length > DEFAULT_LIMITS.maxFiles) {
      return NextResponse.json(
        { ok: false, error: UserMessages.tooMany, code: "TOO_MANY" },
        { status: 400 },
      );
    }

    for (const f of files) {
      if (isDangerousFileName(f.name)) {
        return NextResponse.json(
          { ok: false, error: UserMessages.dangerous, code: "DANGEROUS" },
          { status: 400 },
        );
      }
      if (f.size > DEFAULT_LIMITS.maxFileBytes) {
        return NextResponse.json(
          { ok: false, error: UserMessages.tooLarge, code: "TOO_LARGE" },
          { status: 413 },
        );
      }
    }

    const buffers = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        buffer: Buffer.from(await f.arrayBuffer()),
      })),
    );

    let saved: Saved;

    switch (kind) {
      case "pdf-merge": {
        if (buffers.length < 2) {
          throw new AppError("Envie pelo menos dois PDFs para juntar.", "NEED_FILES", 400);
        }
        saved = await persist(
          await mergePdfs(buffers.map((b) => b.buffer)),
          "juntado.pdf",
          "application/pdf",
        );
        break;
      }
      case "pdf-split": {
        const mode = (options.splitMode as "pages" | "range") || "pages";
        const ranges = String(options.ranges || "");
        const parts = await splitPdf(buffers[0].buffer, mode, ranges || undefined);
        saved =
          parts.buffers.length === 1
            ? await persist(parts.buffers[0], parts.names[0], "application/pdf")
            : await persistZip(
                parts.buffers.map((buffer, i) => ({ name: parts.names[i], buffer })),
                "pdf-dividido.zip",
              );
        break;
      }
      case "pdf-compress": {
        const level = (options.level as "low" | "medium" | "high") || "medium";
        const results = [];
        for (const item of buffers) {
          const out = await compressPdf(item.buffer, level);
          results.push({
            name: `${item.name.replace(/\.pdf$/i, "") || "arquivo"}-comprimido.pdf`,
            buffer: out,
          });
        }
        saved = await mapOneOrZip(results, "pdfs-comprimidos.zip", "application/pdf");
        break;
      }
      case "pdf-rotate": {
        const deg = Number(options.degrees || 90) as 90 | 180 | 270;
        const results = [];
        for (const item of buffers) {
          results.push({
            name: `${item.name.replace(/\.pdf$/i, "") || "arquivo"}-rotacionado.pdf`,
            buffer: await rotatePdf(item.buffer, deg),
          });
        }
        saved = await mapOneOrZip(results, "pdfs-rotacionados.zip", "application/pdf");
        break;
      }
      case "pdf-watermark": {
        const text = String(options.text || "MITI").trim() || "MITI";
        const opacity = Number(options.opacity ?? 0.25);
        const results = [];
        for (const item of buffers) {
          results.push({
            name: `${item.name.replace(/\.pdf$/i, "") || "arquivo"}-marca.pdf`,
            buffer: await watermarkPdf(item.buffer, text, opacity),
          });
        }
        saved = await mapOneOrZip(results, "pdfs-marca.zip", "application/pdf");
        break;
      }
      case "pdf-protect": {
        const password = String(options.password || "");
        if (password.length < 4) {
          throw new AppError("Informe uma senha com pelo menos 4 caracteres.", "WEAK_PASS", 400);
        }
        const results = [];
        for (const item of buffers) {
          results.push({
            name: `${item.name.replace(/\.pdf$/i, "") || "arquivo"}-protegido.pdf`,
            buffer: await protectPdf(item.buffer, password),
          });
        }
        saved = await mapOneOrZip(results, "pdfs-protegidos.zip", "application/pdf");
        break;
      }
      case "pdf-unlock": {
        const password = String(options.password || "");
        if (!password) throw new AppError("Informe a senha atual do PDF.", "NEED_PASS", 400);
        const results = [];
        for (const item of buffers) {
          results.push({
            name: `${item.name.replace(/\.pdf$/i, "") || "arquivo"}-desbloqueado.pdf`,
            buffer: await unlockPdf(item.buffer, password),
          });
        }
        saved = await mapOneOrZip(results, "pdfs-desbloqueados.zip", "application/pdf");
        break;
      }
      case "word-to-pdf": {
        const results = [];
        for (const item of buffers) {
          results.push({
            name: `${item.name.replace(/\.(docx?|odt|rtf)$/i, "") || "documento"}.pdf`,
            buffer: await wordToPdf(item.buffer, item.name),
          });
        }
        saved = await mapOneOrZip(results, "word-para-pdf.zip", "application/pdf");
        break;
      }
      case "excel-to-pdf": {
        const results = [];
        for (const item of buffers) {
          results.push({
            name: `${item.name.replace(/\.(xlsx?|ods|csv)$/i, "") || "planilha"}.pdf`,
            buffer: await excelToPdf(item.buffer, item.name),
          });
        }
        saved = await mapOneOrZip(results, "excel-para-pdf.zip", "application/pdf");
        break;
      }
      case "ppt-to-pdf": {
        const results = [];
        for (const item of buffers) {
          results.push({
            name: `${item.name.replace(/\.(pptx?|odp)$/i, "") || "apresentacao"}.pdf`,
            buffer: await pptToPdf(item.buffer, item.name),
          });
        }
        saved = await mapOneOrZip(results, "ppt-para-pdf.zip", "application/pdf");
        break;
      }
      case "pdf-to-word": {
        const results = [];
        for (const item of buffers) {
          results.push({
            name: `${item.name.replace(/\.pdf$/i, "") || "documento"}.docx`,
            buffer: await pdfToWord(item.buffer),
          });
        }
        saved = await mapOneOrZip(
          results,
          "pdf-para-word.zip",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        );
        break;
      }
      case "pdf-to-excel": {
        const results = [];
        for (const item of buffers) {
          results.push({
            name: `${item.name.replace(/\.pdf$/i, "") || "planilha"}.xlsx`,
            buffer: await pdfToExcel(item.buffer),
          });
        }
        saved = await mapOneOrZip(
          results,
          "pdf-para-excel.zip",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        break;
      }
      case "pdf-to-ppt": {
        const results = [];
        for (const item of buffers) {
          results.push({
            name: `${item.name.replace(/\.pdf$/i, "") || "apresentacao"}.pptx`,
            buffer: await pdfToPpt(item.buffer),
          });
        }
        saved = await mapOneOrZip(
          results,
          "pdf-para-powerpoint.zip",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        );
        break;
      }
      case "html-to-pdf": {
        const htmlText = form.get("htmlText")?.toString();
        if (htmlText?.trim()) {
          saved = await persist(
            await htmlToPdf(htmlText, "entrada.html"),
            "pagina.pdf",
            "application/pdf",
          );
        } else if (buffers.length) {
          const results = [];
          for (const item of buffers) {
            results.push({
              name: `${item.name.replace(/\.(html?|htm)$/i, "") || "pagina"}.pdf`,
              buffer: await htmlToPdf(item.buffer, item.name),
            });
          }
          saved = await mapOneOrZip(results, "html-para-pdf.zip", "application/pdf");
        } else {
          throw new AppError("Envie um arquivo HTML ou cole o código HTML.", "NEED_HTML", 400);
        }
        break;
      }
      case "pdf-edit": {
        let working: Buffer = Buffer.from(buffers[0].buffer);
        const deleteList = String(options.deletePages || "")
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n > 0);
        if (deleteList.length) working = Buffer.from(await deletePages(working, deleteList));

        const order = String(options.pageOrder || "")
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n > 0);
        if (order.length) working = Buffer.from(await reorderPages(working, order));

        const text = String(options.text || "").trim();
        if (text) {
          working = Buffer.from(
            await addText(working, text, {
              page: Number(options.page || 1),
              x: Number(options.x || 50),
              y: Number(options.y || 50),
              size: Number(options.fontSize || 14),
            }),
          );
        }
        saved = await persist(working, "editado.pdf", "application/pdf");
        break;
      }
      case "pdf-sign": {
        if (!(signature instanceof File)) {
          throw new AppError("Envie a imagem da assinatura (PNG ou JPG).", "NEED_SIGN", 400);
        }
        const sigBuf = Buffer.from(await signature.arrayBuffer());
        saved = await persist(
          await signPdf(buffers[0].buffer, sigBuf, {
            pages: options.allPages ? "all" : "last",
          }),
          "assinado.pdf",
          "application/pdf",
        );
        break;
      }
      default:
        throw new AppError("Ferramenta não suportada nesta API.", "UNSUPPORTED_TOOL", 400);
    }

    return NextResponse.json({ ok: true, ...saved });
  } catch (error) {
    logTechnical("api.tools", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const mapped = toUserError(error);
    return NextResponse.json(
      { ok: false, error: mapped.message, code: mapped.code },
      { status: 422 },
    );
  }
}
