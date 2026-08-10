import { PDFDocument } from "pdf-lib";
import { AppError, UserMessages, logTechnical } from "@/lib/errors";
import { isLibreOfficeAvailable, rewritePdfViaLibreOffice } from "./libreoffice";

export type CompressLevel = "low" | "medium" | "high";

function toUint8(buffer: Buffer): Uint8Array {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

/**
 * Compresses a PDF.
 * - low: pdf-lib rewrite (object streams, drops unused objects)
 * - medium/high: LibreOffice PDF rewrite with Quality filters when available,
 *   falling back to pdf-lib rewrite
 */
export async function compressPdf(
  buffer: Buffer,
  level: CompressLevel = "medium",
): Promise<Buffer> {
  if (!buffer?.length) {
    throw new AppError(UserMessages.pdfEmpty, "PDF_EMPTY", 400);
  }

  try {
    if ((level === "medium" || level === "high") && isLibreOfficeAvailable()) {
      // Draw PDF Export filter: JPEG quality lower for higher compression.
      // Quality is 1-100; we map medium→60, high→35.
      const quality = level === "high" ? 35 : 60;
      const filter = `draw_pdf_Export:{"Quality":{"type":"long","value":"${quality}"}}`;
      try {
        const rewritten = await rewritePdfViaLibreOffice(buffer, filter);
        if (rewritten.length > 0 && rewritten.length <= buffer.length) {
          return rewritten;
        }
        // If LibreOffice produced a larger file, still try plain rewrite
        const plain = await rewritePdfViaLibreOffice(buffer);
        if (plain.length > 0 && plain.length < buffer.length) return plain;
      } catch (error) {
        logTechnical("pdf.compress.libreoffice", error, { level });
        // fall through to pdf-lib
      }
    }

    return rewriteWithPdfLib(buffer);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logTechnical("pdf.compress", error, { level });
    throw new AppError(UserMessages.pdfCompressFailed, "PDF_COMPRESS_FAILED", 400);
  }
}

async function rewriteWithPdfLib(buffer: Buffer): Promise<Buffer> {
  try {
    const src = await PDFDocument.load(toUint8(buffer), { ignoreEncryption: true });
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const page of pages) out.addPage(page);

    // Prefer object streams + discard unused objects for mild size reduction
    const bytes = await out.save({ useObjectStreams: true });
    return Buffer.from(bytes);
  } catch (error) {
    logTechnical("pdf.compress.pdflib", error);
    throw new AppError(UserMessages.pdfCompressFailed, "PDF_COMPRESS_FAILED", 400);
  }
}
