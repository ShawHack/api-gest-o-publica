import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { applyTextEdits, type PdfTextEdit } from "@/services/pdf";
import { AppError, logTechnical, toUserError, UserMessages } from "@/lib/errors";
import { DEFAULT_LIMITS } from "@/lib/limits";
import { sanitizeFileName, isDangerousFileName } from "@/lib/sanitize";
import { createWorkDir, saveResult, startCleanupScheduler } from "@/services/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

startCleanupScheduler();

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const editsRaw = form.get("edits");

    if (!(file instanceof File)) {
      throw new AppError("Envie um arquivo PDF para editar.", "NEED_FILE", 400);
    }
    if (isDangerousFileName(file.name)) {
      throw new AppError(UserMessages.dangerous, "DANGEROUS", 400);
    }
    if (file.size <= 0 || file.size > DEFAULT_LIMITS.maxFileBytes) {
      throw new AppError(UserMessages.tooLarge, "TOO_LARGE", 400);
    }

    let edits: PdfTextEdit[] = [];
    try {
      const parsed = JSON.parse(String(editsRaw || "[]")) as unknown;
      if (!Array.isArray(parsed)) throw new Error("not array");
      edits = parsed.map((item, index) => {
        const row = item as Record<string, unknown>;
        const pageIndex = Number(row.pageIndex);
        const x = Number(row.x);
        const y = Number(row.y);
        const width = Number(row.width);
        const height = Number(row.height);
        const fontSize = Number(row.fontSize);
        const text = String(row.text ?? "");
        if (
          !Number.isFinite(pageIndex) ||
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          !Number.isFinite(width) ||
          !Number.isFinite(height) ||
          !Number.isFinite(fontSize)
        ) {
          throw new Error(`invalid edit ${index}`);
        }
        return { pageIndex, x, y, width, height, fontSize, text };
      });
    } catch {
      throw new AppError("Lista de edições inválida.", "PDF_EDIT_FAILED", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const out = await applyTextEdits(buffer, edits);
    const base = sanitizeFileName(file.name).replace(/\.pdf$/i, "") || "documento";
    const fileName = `${base}-editado.pdf`;

    const { id, dir } = await createWorkDir();
    const safe = sanitizeFileName(fileName);
    const filePath = path.join(dir, safe);
    await fs.writeFile(filePath, out);
    await saveResult({
      id,
      filePath,
      fileName: safe,
      mime: "application/pdf",
      size: out.byteLength,
      width: 0,
      height: 0,
      inputFormat: "pdf",
      outputFormat: "pdf",
    });

    return NextResponse.json({
      ok: true,
      resultId: id,
      fileName: safe,
      mime: "application/pdf",
      size: out.byteLength,
    });
  } catch (error) {
    logTechnical("api.pdf.text-edit", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const mapped = toUserError(error);
    return NextResponse.json(
      { ok: false, error: mapped.message, code: mapped.code },
      { status: 422 },
    );
  }
}
