import { NextResponse } from "next/server";
import { convertMergedPdf, convertSingleImage } from "@/services/conversion";
import { AppError, logTechnical, toUserError, UserMessages } from "@/lib/errors";
import { DEFAULT_LIMITS } from "@/lib/limits";
import type { ConvertOptions, OutputFormat } from "@/types/converter";
import { defaultConvertOptions } from "@/lib/formats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseOptions(raw: string | null): ConvertOptions {
  if (!raw) return defaultConvertOptions("png");
  try {
    const parsed = JSON.parse(raw) as ConvertOptions;
    return {
      ...defaultConvertOptions(parsed.outputFormat || "png"),
      ...parsed,
      resize: { ...defaultConvertOptions().resize, ...parsed.resize },
      format: { ...defaultConvertOptions().format, ...parsed.format },
    };
  } catch {
    return defaultConvertOptions("png");
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const mode = String(form.get("mode") || "single");
    const options = parseOptions(form.get("options")?.toString() || null);

    if (mode === "merged-pdf") {
      const files = form.getAll("files").filter((f): f is File => f instanceof File);
      const idsRaw = form.get("fileIds")?.toString() || "[]";
      const orderRaw = form.get("order")?.toString() || "[]";
      let ids: string[] = [];
      let order: string[] = [];
      try {
        ids = JSON.parse(idsRaw);
        order = JSON.parse(orderRaw);
      } catch {
        /* ignore */
      }

      if (!files.length) {
        return NextResponse.json(
          { ok: false, error: "Nenhuma imagem enviada.", code: "EMPTY" },
          { status: 400 },
        );
      }

      if (files.length > DEFAULT_LIMITS.maxFiles) {
        return NextResponse.json(
          { ok: false, error: UserMessages.tooMany, code: "TOO_MANY" },
          { status: 400 },
        );
      }

      const total = files.reduce((sum, f) => sum + f.size, 0);
      if (total > DEFAULT_LIMITS.maxBatchBytes) {
        return NextResponse.json(
          { ok: false, error: UserMessages.batchTooLarge, code: "BATCH_TOO_LARGE" },
          { status: 413 },
        );
      }

      const buffers = await Promise.all(
        files.map(async (file, index) => ({
          buffer: Buffer.from(await file.arrayBuffer()),
          originalName: file.name,
          id: ids[index] || `file-${index}`,
        })),
      );

      const result = await convertMergedPdf({
        files: buffers,
        options: { ...options, outputFormat: "pdf" },
        order,
      });

      return NextResponse.json({ ok: true, ...result });
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Nenhuma imagem enviada.", code: "EMPTY" },
        { status: 400 },
      );
    }

    const perFileOutput = form.get("outputFormat")?.toString() as OutputFormat | undefined;
    const inputOverrideRaw = form.get("inputFormat")?.toString();
    const inputFormatOverride =
      inputOverrideRaw && inputOverrideRaw !== "auto"
        ? (inputOverrideRaw as import("@/types/converter").InputFormat)
        : undefined;
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await convertSingleImage({
      buffer,
      originalName: file.name,
      options,
      perFileOutput,
      inputFormatOverride,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logTechnical("api.convert", error);
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
