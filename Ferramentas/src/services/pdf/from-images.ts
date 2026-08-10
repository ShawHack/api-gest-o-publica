import PDFDocument from "pdfkit";
import type { FormatOptions } from "@/types/converter";

export interface PdfPage {
  buffer: Buffer;
  width: number;
  height: number;
}

function pageSize(
  orientation: FormatOptions["pdfOrientation"],
  imageWidth: number,
  imageHeight: number,
): { width: number; height: number } {
  const a4 = { width: 595.28, height: 841.89 };
  if (orientation === "landscape") return { width: a4.height, height: a4.width };
  if (orientation === "portrait") return a4;
  // auto
  if (imageWidth > imageHeight) return { width: a4.height, height: a4.width };
  return a4;
}

export async function imagesToPdf(
  pages: PdfPage[],
  options: Pick<
    FormatOptions,
    "pdfOrientation" | "pdfFitToPage" | "pdfPreserveAspect"
  >,
): Promise<Buffer> {
  if (!pages.length) {
    throw new Error("PDF sem páginas");
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false, margin: 0 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    for (const page of pages) {
      const size = pageSize(options.pdfOrientation, page.width, page.height);
      doc.addPage({ size: [size.width, size.height], margin: 0 });

      if (!options.pdfFitToPage) {
        doc.image(page.buffer, 0, 0, {
          width: Math.min(page.width, size.width),
          height: Math.min(page.height, size.height),
        });
        continue;
      }

      if (options.pdfPreserveAspect) {
        const scale = Math.min(size.width / page.width, size.height / page.height);
        const w = page.width * scale;
        const h = page.height * scale;
        const x = (size.width - w) / 2;
        const y = (size.height - h) / 2;
        doc.image(page.buffer, x, y, { width: w, height: h });
      } else {
        doc.image(page.buffer, 0, 0, { width: size.width, height: size.height });
      }
    }

    doc.end();
  });
}
