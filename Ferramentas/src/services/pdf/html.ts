import { AppError, UserMessages } from "@/lib/errors";
import { convertToPdf } from "./libreoffice";

/**
 * Converts HTML (string or file buffer) to PDF via LibreOffice.
 */
export async function htmlToPdf(
  html: string | Buffer,
  fileName = "document.html",
): Promise<Buffer> {
  const buffer = Buffer.isBuffer(html) ? html : Buffer.from(html, "utf8");
  if (!buffer.length || !buffer.toString("utf8").trim()) {
    throw new AppError(UserMessages.pdfHtmlEmpty, "PDF_HTML_EMPTY", 400);
  }

  const lower = fileName.toLowerCase();
  const safeName =
    lower.endsWith(".html") || lower.endsWith(".htm") ? fileName : "document.html";

  return convertToPdf(buffer, safeName);
}
