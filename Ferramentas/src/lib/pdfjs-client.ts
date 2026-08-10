import { withBasePath } from "@/lib/base-path";

let configured = false;

/**
 * Configura o worker do pdf.js a partir de `/public` (evita CDN 404).
 */
export async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  if (!configured) {
    pdfjs.GlobalWorkerOptions.workerSrc = withBasePath("/pdf.worker.min.mjs");
    configured = true;
  }
  return pdfjs;
}
