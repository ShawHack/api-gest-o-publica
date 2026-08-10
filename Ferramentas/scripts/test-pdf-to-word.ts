import { PDFDocument, StandardFonts } from "pdf-lib";
import { pdfToWord } from "../src/services/pdf/office";

async function main() {
  const d = await PDFDocument.create();
  const p = d.addPage([420, 240]);
  const f = await d.embedFont(StandardFonts.Helvetica);
  p.drawText("Teste SEMIT PDF para Word", { x: 40, y: 140, size: 18, font: f });
  p.drawText("Linha 2 do documento.", { x: 40, y: 110, size: 14, font: f });
  const pdf = Buffer.from(await d.save());
  const docx = await pdfToWord(pdf);
  console.log("OK docx bytes", docx.byteLength, docx.subarray(0, 4).toString("hex"));
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
