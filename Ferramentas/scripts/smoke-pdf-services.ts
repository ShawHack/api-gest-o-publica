/**
 * Smoke test for PDF services (pdf-lib ops + muhammara security).
 * Run: npx tsx scripts/smoke-pdf-services.ts
 */
import { PDFDocument, rgb } from "pdf-lib";
import {
  mergePdfs,
  splitPdf,
  rotatePdf,
  watermarkPdf,
  protectPdf,
  unlockPdf,
  compressPdf,
  reorderPages,
  deletePages,
  addText,
  signPdf,
} from "../src/services/pdf";

async function makePagePdf(label: string, color: { r: number; g: number; b: number }): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 400]);
  page.drawRectangle({
    x: 20,
    y: 20,
    width: 260,
    height: 360,
    color: rgb(color.r, color.g, color.b),
  });
  page.drawText(label, { x: 40, y: 200, size: 24 });
  return Buffer.from(await doc.save());
}

async function main() {
  const a = await makePagePdf("A", { r: 0.9, g: 0.3, b: 0.3 });
  const b = await makePagePdf("B", { r: 0.2, g: 0.6, b: 0.9 });

  const merged = await mergePdfs([a, b]);
  console.log("merge ok", merged.length);

  const split = await splitPdf(merged, "pages");
  console.log("split pages", split.buffers.length, split.names.join(","));

  const ranged = await splitPdf(merged, "range", "1-2");
  console.log("split range", ranged.buffers[0]!.length);

  const rotated = await rotatePdf(merged, 90);
  console.log("rotate ok", rotated.length);

  const marked = await watermarkPdf(merged, "CONFIDENCIAL", 0.3);
  console.log("watermark ok", marked.length);

  const compressed = await compressPdf(merged, "low");
  console.log("compress low ok", compressed.length);

  const reordered = await reorderPages(merged, [2, 1]);
  console.log("reorder ok", reordered.length);

  const deleted = await deletePages(merged, [1]);
  console.log("delete ok", deleted.length);

  const withText = await addText(a, "Olá PDF", { x: 50, y: 50, size: 14 });
  console.log("addText ok", withText.length);

  // Minimal 1x1 PNG
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const signed = await signPdf(merged, png, { width: 40, height: 20 });
  console.log("sign ok", signed.length);

  const protectedPdf = await protectPdf(merged, "senha123");
  console.log("protect ok", protectedPdf.length);

  const unlocked = await unlockPdf(protectedPdf, "senha123");
  console.log("unlock ok", unlocked.length);

  console.log("SMOKE PDF SERVICES OK");
}

main().catch((err) => {
  console.error("SMOKE FAILED", err);
  process.exit(1);
});
