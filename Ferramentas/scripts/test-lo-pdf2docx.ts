import { PDFDocument, StandardFonts } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { spawn } from "child_process";

async function run(cmd: string, args: string[]) {
  return new Promise<{ code: number; stderr: string }>((resolve) => {
    const child = spawn(cmd, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (c) => (stderr += c.toString()));
    child.on("close", (code) => resolve({ code: code ?? 1, stderr }));
  });
}

async function main() {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "lo-pdf2docx-"));
  const pdfPath = path.join(tmp, "input.pdf");
  const d = await PDFDocument.create();
  const p = d.addPage([400, 200]);
  const f = await d.embedFont(StandardFonts.Helvetica);
  p.drawText("Ola SEMIT teste PDF para Word", { x: 40, y: 120, size: 16, font: f });
  await fs.writeFile(pdfPath, Buffer.from(await d.save()));

  const soffice = "C:\\Program Files\\LibreOffice\\program\\soffice.exe";
  const attempts = [
    ["--headless", "--norestore", "--nolockcheck", "--infilter=writer_pdf_import", "--convert-to", "docx", "--outdir", tmp, pdfPath],
    ["--headless", "--norestore", "--nolockcheck", "--convert-to", "odt", "--outdir", tmp, pdfPath],
    ["--headless", "--norestore", "--nolockcheck", "--convert-to", "html", "--outdir", tmp, pdfPath],
    ["--headless", "--norestore", "--nolockcheck", "--convert-to", "docx:MS Word 2007 XML", "--outdir", tmp, pdfPath],
  ];

  for (const args of attempts) {
    console.log("TRY", args.join(" "));
    const r = await run(soffice, args);
    console.log("code", r.code, "stderr", r.stderr.slice(0, 400));
    console.log(
      "files",
      (await fs.readdir(tmp)).map(async (n) => `${n}:${(await fs.stat(path.join(tmp, n))).size}`),
    );
    console.log(
      "files",
      await Promise.all(
        (await fs.readdir(tmp)).map(async (n) => `${n}:${(await fs.stat(path.join(tmp, n))).size}`),
      ),
    );
  }
}

main().catch(console.error);
