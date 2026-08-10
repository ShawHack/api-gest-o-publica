import { PDFDocument, StandardFonts, rgb, type RGB } from "pdf-lib";
import { AppError, UserMessages, logTechnical } from "@/lib/errors";

/** Parses ranges like "1-3,5,7-8" into 0-based page indices. */
function parsePageRanges(ranges: string, pageCount: number): number[] {
  const cleaned = ranges.replace(/\s+/g, "");
  if (!cleaned) {
    throw new AppError(UserMessages.pdfRangeInvalid, "PDF_RANGE_INVALID", 400);
  }

  const indices = new Set<number>();
  for (const part of cleaned.split(",")) {
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

function toUint8(buffer: Buffer): Uint8Array {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

async function loadPdf(buffer: Buffer): Promise<PDFDocument> {
  if (!buffer?.length) {
    throw new AppError(UserMessages.pdfEmpty, "PDF_EMPTY", 400);
  }
  try {
    return await PDFDocument.load(toUint8(buffer), { ignoreEncryption: true });
  } catch (error) {
    logTechnical("pdf.edit.load", error);
    throw new AppError(UserMessages.pdfInvalid, "PDF_INVALID", 400);
  }
}

async function savePdf(doc: PDFDocument): Promise<Buffer> {
  return Buffer.from(await doc.save({ useObjectStreams: true }));
}

/**
 * Reorders pages. `order` is 1-based page numbers in the desired order.
 * Omitting a page removes it; duplicates are allowed if requested.
 */
export async function reorderPages(buffer: Buffer, order: number[]): Promise<Buffer> {
  if (!order?.length) {
    throw new AppError(UserMessages.pdfRangeInvalid, "PDF_RANGE_INVALID", 400);
  }

  try {
    const src = await loadPdf(buffer);
    const pageCount = src.getPageCount();
    const indices = order.map((n) => {
      if (!Number.isInteger(n) || n < 1 || n > pageCount) {
        throw new AppError(UserMessages.pdfPageOutOfRange, "PDF_PAGE_OUT_OF_RANGE", 400);
      }
      return n - 1;
    });

    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, indices);
    for (const page of copied) out.addPage(page);
    return savePdf(out);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logTechnical("pdf.reorder", error);
    throw new AppError(UserMessages.pdfEditFailed, "PDF_EDIT_FAILED", 400);
  }
}

/**
 * Deletes pages by 1-based indices or a range string like "1,3-4".
 */
export async function deletePages(
  buffer: Buffer,
  pages: number[] | string,
): Promise<Buffer> {
  try {
    const src = await loadPdf(buffer);
    const pageCount = src.getPageCount();

    const toDelete = new Set<number>(
      typeof pages === "string"
        ? parsePageRanges(pages, pageCount)
        : pages.map((n) => {
            if (!Number.isInteger(n) || n < 1 || n > pageCount) {
              throw new AppError(UserMessages.pdfPageOutOfRange, "PDF_PAGE_OUT_OF_RANGE", 400);
            }
            return n - 1;
          }),
    );

    if (toDelete.size === 0) {
      throw new AppError(UserMessages.pdfRangeInvalid, "PDF_RANGE_INVALID", 400);
    }
    if (toDelete.size >= pageCount) {
      throw new AppError("Não é possível remover todas as páginas do PDF.", "PDF_EDIT_FAILED", 400);
    }

    const keep = src.getPageIndices().filter((i) => !toDelete.has(i));
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, keep);
    for (const page of copied) out.addPage(page);
    return savePdf(out);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logTechnical("pdf.deletePages", error);
    throw new AppError(UserMessages.pdfEditFailed, "PDF_EDIT_FAILED", 400);
  }
}

export interface AddTextOptions {
  /** 1-based page number; defaults to first page */
  page?: number;
  x: number;
  y: number;
  size?: number;
  color?: RGB;
}

/**
 * Draws text at a PDF-space position (origin bottom-left).
 */
export async function addText(
  buffer: Buffer,
  text: string,
  options: AddTextOptions,
): Promise<Buffer> {
  if (!text?.trim()) {
    throw new AppError("Informe o texto a inserir.", "PDF_EDIT_FAILED", 400);
  }

  try {
    const doc = await loadPdf(buffer);
    const pageIndex = (options.page ?? 1) - 1;
    if (pageIndex < 0 || pageIndex >= doc.getPageCount()) {
      throw new AppError(UserMessages.pdfPageOutOfRange, "PDF_PAGE_OUT_OF_RANGE", 400);
    }

    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.getPage(pageIndex);
    page.drawText(text, {
      x: options.x,
      y: options.y,
      size: options.size ?? 12,
      font,
      color: options.color ?? rgb(0, 0, 0),
    });

    return savePdf(doc);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logTechnical("pdf.addText", error);
    throw new AppError(UserMessages.pdfEditFailed, "PDF_EDIT_FAILED", 400);
  }
}

export type PdfTextEdit = {
  /** 0-based page index */
  pageIndex: number;
  /** PDF user-space (origin bottom-left) */
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
};

/**
 * Substitui trechos de texto: cobre a área original e redesenha o novo conteúdo.
 * Limitação: usa Helvetica padrão (não reutiliza a fonte embutida do PDF).
 */
export async function applyTextEdits(buffer: Buffer, edits: PdfTextEdit[]): Promise<Buffer> {
  if (!edits?.length) {
    throw new AppError("Nenhuma alteração de texto para aplicar.", "PDF_EDIT_FAILED", 400);
  }

  try {
    const doc = await loadPdf(buffer);
    const pageCount = doc.getPageCount();
    const font = await doc.embedFont(StandardFonts.Helvetica);

    for (const edit of edits) {
      if (edit.pageIndex < 0 || edit.pageIndex >= pageCount) {
        throw new AppError(UserMessages.pdfPageOutOfRange, "PDF_PAGE_OUT_OF_RANGE", 400);
      }
      const page = doc.getPage(edit.pageIndex);
      const fontSize = Math.max(6, Math.min(72, edit.fontSize || 12));
      const padX = 1;
      const padY = 2;
      const coverWidth = Math.max(edit.width, font.widthOfTextAtSize(edit.text || " ", fontSize) + padX * 2);
      const coverHeight = Math.max(edit.height, fontSize * 1.15) + padY;

      page.drawRectangle({
        x: edit.x - padX,
        y: edit.y - padY * 0.4,
        width: coverWidth + padX,
        height: coverHeight,
        color: rgb(1, 1, 1),
        borderWidth: 0,
      });

      if (edit.text.length > 0) {
        page.drawText(edit.text, {
          x: edit.x,
          y: edit.y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
          maxWidth: coverWidth,
        });
      }
    }

    return savePdf(doc);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logTechnical("pdf.applyTextEdits", error);
    throw new AppError(UserMessages.pdfEditFailed, "PDF_EDIT_FAILED", 400);
  }
}
