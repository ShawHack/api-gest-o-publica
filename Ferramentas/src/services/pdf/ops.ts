import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { AppError, UserMessages, logTechnical } from "@/lib/errors";
import { protectPdf, unlockPdf } from "./security";

export { protectPdf, unlockPdf };

function toUint8(buffer: Buffer): Uint8Array {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

async function loadPdf(buffer: Buffer): Promise<PDFDocument> {
  if (!buffer || buffer.length === 0) {
    throw new AppError(UserMessages.pdfEmpty, "PDF_EMPTY", 400);
  }
  try {
    return await PDFDocument.load(toUint8(buffer), { ignoreEncryption: true });
  } catch (error) {
    logTechnical("pdf.load", error);
    throw new AppError(UserMessages.pdfInvalid, "PDF_INVALID", 400);
  }
}

async function savePdf(doc: PDFDocument): Promise<Buffer> {
  const bytes = await doc.save({ useObjectStreams: true });
  return Buffer.from(bytes);
}

/**
 * Merges multiple PDF buffers into a single PDF.
 */
export async function mergePdfs(buffers: Buffer[]): Promise<Buffer> {
  if (!buffers.length) {
    throw new AppError(UserMessages.pdfEmpty, "PDF_EMPTY", 400);
  }

  const merged = await PDFDocument.create();

  for (const [index, buffer] of buffers.entries()) {
    if (!buffer?.length) {
      throw new AppError(`PDF #${index + 1} está vazio.`, "PDF_EMPTY", 400);
    }
    const src = await loadPdf(buffer);
    const pages = await merged.copyPages(src, src.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }

  return savePdf(merged);
}

/**
 * Parses ranges like "1-3,5,7-8" into 0-based page indices.
 */
export function parsePageRanges(ranges: string, pageCount: number): number[] {
  const cleaned = ranges.replace(/\s+/g, "");
  if (!cleaned) {
    throw new AppError(UserMessages.pdfRangeInvalid, "PDF_RANGE_INVALID", 400);
  }

  const indices = new Set<number>();
  const parts = cleaned.split(",");

  for (const part of parts) {
    if (!part) continue;
    if (part.includes("-")) {
      const [startRaw, endRaw] = part.split("-");
      const start = Number.parseInt(startRaw ?? "", 10);
      const end = Number.parseInt(endRaw ?? "", 10);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end < start) {
        throw new AppError(UserMessages.pdfRangeInvalid, "PDF_RANGE_INVALID", 400);
      }
      if (end > pageCount) {
        throw new AppError(UserMessages.pdfPageOutOfRange, "PDF_PAGE_OUT_OF_RANGE", 400);
      }
      for (let p = start; p <= end; p++) indices.add(p - 1);
    } else {
      const page = Number.parseInt(part, 10);
      if (!Number.isFinite(page) || page < 1) {
        throw new AppError(UserMessages.pdfRangeInvalid, "PDF_RANGE_INVALID", 400);
      }
      if (page > pageCount) {
        throw new AppError(UserMessages.pdfPageOutOfRange, "PDF_PAGE_OUT_OF_RANGE", 400);
      }
      indices.add(page - 1);
    }
  }

  return [...indices].sort((a, b) => a - b);
}

/**
 * Splits a PDF.
 * - mode "pages": one file per page
 * - mode "range": one file containing the selected ranges (e.g. "1-3,5")
 */
export async function splitPdf(
  buffer: Buffer,
  mode: "pages" | "range",
  ranges?: string,
): Promise<{ buffers: Buffer[]; names: string[] }> {
  const src = await loadPdf(buffer);
  const pageCount = src.getPageCount();

  if (mode === "pages") {
    const buffers: Buffer[] = [];
    const names: string[] = [];
    for (let i = 0; i < pageCount; i++) {
      const doc = await PDFDocument.create();
      const [copied] = await doc.copyPages(src, [i]);
      doc.addPage(copied);
      buffers.push(await savePdf(doc));
      names.push(`pagina-${i + 1}.pdf`);
    }
    return { buffers, names };
  }

  if (!ranges) {
    throw new AppError(UserMessages.pdfRangeInvalid, "PDF_RANGE_INVALID", 400);
  }

  const indices = parsePageRanges(ranges, pageCount);
  const doc = await PDFDocument.create();
  const copied = await doc.copyPages(src, indices);
  for (const page of copied) doc.addPage(page);

  const safeName = ranges.replace(/[^0-9,\-]/g, "_").slice(0, 40);
  return {
    buffers: [await savePdf(doc)],
    names: [`paginas-${safeName || "selecao"}.pdf`],
  };
}

export async function rotatePdf(buffer: Buffer, angle: 90 | 180 | 270): Promise<Buffer> {
  if (![90, 180, 270].includes(angle)) {
    throw new AppError("Ângulo de rotação inválido. Use 90, 180 ou 270.", "PDF_ROTATE_INVALID", 400);
  }

  const doc = await loadPdf(buffer);
  for (const page of doc.getPages()) {
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + angle) % 360));
  }
  return savePdf(doc);
}

export async function watermarkPdf(
  buffer: Buffer,
  text: string,
  opacity = 0.25,
): Promise<Buffer> {
  if (!text?.trim()) {
    throw new AppError("Informe o texto da marca d'água.", "PDF_WATERMARK_EMPTY", 400);
  }

  try {
    const doc = await loadPdf(buffer);
    const font = await doc.embedFont(StandardFonts.HelveticaBold);

    for (const page of doc.getPages()) {
      const { width, height } = page.getSize();
      const fontSize = Math.max(24, Math.min(width, height) / 12);
      const angle = Math.atan2(height, width) * (180 / Math.PI);

      page.drawText(text.trim(), {
        x: width * 0.12,
        y: height * 0.4,
        size: fontSize,
        font,
        rotate: degrees(angle),
        color: rgb(0.5, 0.5, 0.5),
        opacity: Math.min(1, Math.max(0.05, opacity)),
      });
    }

    return savePdf(doc);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logTechnical("pdf.watermark", error);
    throw new AppError(UserMessages.pdfWatermarkFailed, "PDF_WATERMARK_FAILED", 400);
  }
}
