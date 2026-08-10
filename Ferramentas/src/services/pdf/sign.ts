import { PDFDocument } from "pdf-lib";
import { AppError, UserMessages, logTechnical } from "@/lib/errors";

function toUint8(buffer: Buffer): Uint8Array {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

export interface SignOptions {
  /** Apply on last page only (default) or all pages */
  pages?: "last" | "all";
  /** Signature width in PDF points (default 120) */
  width?: number;
  /** Signature height in PDF points (default 48) */
  height?: number;
  /** Margin from right/bottom edges (default 36) */
  margin?: number;
}

function isPng(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  );
}

function isJpeg(buf: Buffer): boolean {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

/**
 * Embeds a PNG/JPG signature image at the bottom-right of the last page (or all pages).
 */
export async function signPdf(
  pdfBuffer: Buffer,
  signatureImage: Buffer,
  options: SignOptions = {},
): Promise<Buffer> {
  if (!pdfBuffer?.length) {
    throw new AppError(UserMessages.pdfEmpty, "PDF_EMPTY", 400);
  }
  if (!signatureImage?.length) {
    throw new AppError(UserMessages.pdfSignFailed, "PDF_SIGN_FAILED", 400);
  }

  try {
    const doc = await PDFDocument.load(toUint8(pdfBuffer), { ignoreEncryption: true });
    const imageBytes = toUint8(signatureImage);

    let image;
    if (isPng(signatureImage)) {
      image = await doc.embedPng(imageBytes);
    } else if (isJpeg(signatureImage)) {
      image = await doc.embedJpg(imageBytes);
    } else {
      throw new AppError(UserMessages.pdfSignFailed, "PDF_SIGN_FAILED", 400);
    }

    const width = options.width ?? 120;
    const height = options.height ?? 48;
    const margin = options.margin ?? 36;
    const pages = doc.getPages();
    const targets =
      options.pages === "all" ? pages : [pages[pages.length - 1]!];

    for (const page of targets) {
      const { width: pw } = page.getSize();
      page.drawImage(image, {
        x: pw - width - margin,
        y: margin,
        width,
        height,
      });
    }

    return Buffer.from(await doc.save({ useObjectStreams: true }));
  } catch (error) {
    if (error instanceof AppError) throw error;
    logTechnical("pdf.sign", error);
    throw new AppError(UserMessages.pdfSignFailed, "PDF_SIGN_FAILED", 400);
  }
}
