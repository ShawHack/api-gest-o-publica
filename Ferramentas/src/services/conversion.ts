import sharp, { type Sharp } from "sharp";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { detectFormatFromBuffer } from "@/lib/detect-format";
import { isConversionAllowed, OUTPUT_EXTENSION, OUTPUT_MIME, supportsTransparency } from "@/lib/formats";
import { buildOutputFileName, isDangerousFileName, sanitizeFileName } from "@/lib/sanitize";
import { AppError, UserMessages, logTechnical, toUserError } from "@/lib/errors";
import { DEFAULT_LIMITS } from "@/lib/limits";
import type { ConvertOptions, InputFormat, OutputFormat } from "@/types/converter";
import { decodeHeicToPng } from "@/services/heic";
import { imagesToPdf } from "@/services/pdf";
import { createWorkDir, saveResult, startCleanupScheduler } from "@/services/storage";

startCleanupScheduler();

function normalizeComparable(format: string): string {
  const f = format.toLowerCase();
  if (f === "jpeg") return "jpg";
  return f;
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = Number.parseInt(full || "ffffff", 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new AppError(UserMessages.timeout, "TIMEOUT", 408)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function toRasterBuffer(input: Buffer, format: InputFormat): Promise<Buffer> {
  if (format === "heic" || format === "heif") {
    return decodeHeicToPng(input);
  }

  if (format === "svg") {
    // Rasterize SVG via sharp/libvips
    return sharp(input, { density: 150 }).png().toBuffer();
  }

  return input;
}

async function applyResize(
  pipeline: Sharp,
  options: ConvertOptions["resize"],
  metaWidth?: number,
  metaHeight?: number,
): Promise<Sharp> {
  if (options.mode === "original") return pipeline;

  const width = options.width && options.width > 0 ? Math.round(options.width) : undefined;
  const height = options.height && options.height > 0 ? Math.round(options.height) : undefined;

  if (options.mode === "width" && width) {
    return pipeline.resize({
      width,
      withoutEnlargement: options.withoutEnlargement,
      fit: options.keepAspectRatio ? "inside" : "fill",
    });
  }

  if (options.mode === "height" && height) {
    return pipeline.resize({
      height,
      withoutEnlargement: options.withoutEnlargement,
      fit: options.keepAspectRatio ? "inside" : "fill",
    });
  }

  if ((options.mode === "both" || options.mode === "fit") && (width || height)) {
    return pipeline.resize({
      width,
      height,
      fit: options.keepAspectRatio ? "inside" : "fill",
      withoutEnlargement: options.withoutEnlargement,
    });
  }

  // Guard unused dims
  void metaWidth;
  void metaHeight;
  return pipeline;
}

async function encodeImage(
  pipeline: Sharp,
  output: OutputFormat,
  options: ConvertOptions["format"],
  hasAlpha: boolean,
): Promise<{ buffer: Buffer; mime: string; width?: number; height?: number; previewPng?: Buffer }> {
  const bg = parseHexColor(options.background || "#ffffff");
  const quality = Math.min(100, Math.max(1, options.quality || 90));

  if (output === "jpg" || output === "bmp") {
    if (hasAlpha || !supportsTransparency(output)) {
      pipeline = pipeline.flatten({ background: bg });
    }
  } else if (!options.preserveTransparency && hasAlpha) {
    pipeline = pipeline.flatten({ background: bg });
  }

  // Metadados: por padrão o Sharp não reescreve EXIF; withMetadata restaura quando solicitado.
  if (options.preserveMetadata && !options.stripMetadata) {
    pipeline = pipeline.withMetadata();
  }

  switch (output) {
    case "jpg":
      return {
        buffer: await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer(),
        mime: OUTPUT_MIME.jpg,
      };
    case "png":
      return {
        buffer: await pipeline
          .png({
            compressionLevel: Math.min(9, Math.max(0, options.pngCompressionLevel ?? 6)),
          })
          .toBuffer(),
        mime: OUTPUT_MIME.png,
      };
    case "webp":
      return {
        buffer: await pipeline
          .webp({
            quality,
            lossless: options.lossless,
          })
          .toBuffer(),
        mime: OUTPUT_MIME.webp,
      };
    case "avif":
      return {
        buffer: await pipeline
          .avif({
            quality,
            lossless: options.lossless,
          })
          .toBuffer(),
        mime: OUTPUT_MIME.avif,
      };
    case "bmp": {
      const flat = await pipeline
        .flatten({ background: bg })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const previewPng = await sharp(flat.data, {
        raw: {
          width: flat.info.width,
          height: flat.info.height,
          channels: flat.info.channels as 3 | 4,
        },
      })
        .png()
        .toBuffer();
      return {
        buffer: encodeBmp(flat.data, flat.info.width, flat.info.height, flat.info.channels),
        mime: OUTPUT_MIME.bmp,
        width: flat.info.width,
        height: flat.info.height,
        previewPng,
      };
    }
    case "tiff":
      return {
        buffer: await pipeline.tiff({ quality, compression: "lzw" }).toBuffer(),
        mime: OUTPUT_MIME.tiff,
      };
    case "ico": {
      const icoPipe = pipeline.resize(256, 256, {
        fit: "contain",
        background: {
          r: bg.r,
          g: bg.g,
          b: bg.b,
          alpha: options.preserveTransparency ? 0 : 1,
        },
      });
      const png = await icoPipe.png().toBuffer();
      return {
        buffer: png,
        mime: OUTPUT_MIME.ico,
        width: 256,
        height: 256,
        previewPng: png,
      };
    }
    default:
      throw new AppError(UserMessages.incompatible, "INCOMPATIBLE", 400);
  }
}

/** Encode BGR 24-bit BMP (no compression). */
function encodeBmp(pixels: Buffer, width: number, height: number, channels: number): Buffer {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelSize = rowSize * height;
  const fileSize = 54 + pixelSize;
  const out = Buffer.alloc(fileSize);

  out.write("BM", 0);
  out.writeUInt32LE(fileSize, 2);
  out.writeUInt32LE(0, 6);
  out.writeUInt32LE(54, 10);
  out.writeUInt32LE(40, 14);
  out.writeInt32LE(width, 18);
  out.writeInt32LE(height, 22);
  out.writeUInt16LE(1, 26);
  out.writeUInt16LE(24, 28);
  out.writeUInt32LE(0, 30);
  out.writeUInt32LE(pixelSize, 34);

  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y;
    for (let x = 0; x < width; x++) {
      const src = (srcY * width + x) * channels;
      const dst = 54 + y * rowSize + x * 3;
      out[dst] = pixels[src + 2];
      out[dst + 1] = pixels[src + 1];
      out[dst + 2] = pixels[src];
    }
  }
  return out;
}

export async function convertSingleImage(params: {
  buffer: Buffer;
  originalName: string;
  options: ConvertOptions;
  perFileOutput?: OutputFormat;
  inputFormatOverride?: InputFormat;
}): Promise<{
  resultId: string;
  fileName: string;
  mime: string;
  size: number;
  width: number;
  height: number;
  inputFormat: string;
  outputFormat: string;
  previewBase64?: string;
}> {
  const { buffer, originalName, options } = params;
  const outputFormat = params.perFileOutput || options.outputFormat;

  if (buffer.byteLength > DEFAULT_LIMITS.maxFileBytes) {
    throw new AppError(UserMessages.tooLarge, "TOO_LARGE", 413);
  }

  if (isDangerousFileName(originalName)) {
    throw new AppError(UserMessages.dangerous, "DANGEROUS", 400);
  }

  const detected = detectFormatFromBuffer(buffer);
  const optionInput =
    options.inputFormat && options.inputFormat !== "auto" ? options.inputFormat : undefined;
  const sourceFormat = params.inputFormatOverride || optionInput || detected;

  if (!sourceFormat) {
    throw new AppError(UserMessages.unsupported, "UNSUPPORTED", 415);
  }

  if (
    detected &&
    params.inputFormatOverride &&
    normalizeComparable(detected) !== normalizeComparable(params.inputFormatOverride)
  ) {
    logTechnical("convert.format_override", new Error("manual input differs from magic bytes"), {
      detected,
      override: params.inputFormatOverride,
      originalName,
    });
  }

  const allowed = isConversionAllowed(sourceFormat, outputFormat);
  if (!allowed.ok) {
    throw new AppError(allowed.reason, "INCOMPATIBLE", 400);
  }

  if (outputFormat === "pdf" && !DEFAULT_LIMITS.pdfEnabled) {
    throw new AppError(UserMessages.pdfDisabled, "PDF_DISABLED", 403);
  }

  return withTimeout(
    (async () => {
      try {
        const raster = await toRasterBuffer(buffer, sourceFormat);

        // Limit pixel bomb — max 50MP
        const probe = sharp(raster, { failOn: "none", animated: false });
        const meta = await probe.metadata();
        const width = meta.width || 0;
        const height = meta.height || 0;
        if (width * height > 50_000_000) {
          throw new AppError(UserMessages.memory, "MEMORY", 413);
        }

        let pipeline = sharp(raster, { failOn: "none", animated: false }).rotate(); // EXIF orientation
        pipeline = await applyResize(pipeline, options.resize, width, height);

        if (outputFormat === "pdf") {
          const png = await pipeline.png().toBuffer();
          const pngMeta = await sharp(png).metadata();
          const pdfBuffer = await imagesToPdf(
            [
              {
                buffer: png,
                width: pngMeta.width || width || 1,
                height: pngMeta.height || height || 1,
              },
            ],
            options.format,
          );

          const { id, dir } = await createWorkDir();
          const fileName = buildOutputFileName(sanitizeFileName(originalName), "pdf");
          const filePath = path.join(dir, fileName);
          await fs.writeFile(filePath, pdfBuffer);
          await saveResult({
            id,
            filePath,
            fileName,
            mime: OUTPUT_MIME.pdf,
            size: pdfBuffer.byteLength,
            width: pngMeta.width || width,
            height: pngMeta.height || height,
            inputFormat: sourceFormat,
            outputFormat: "pdf",
          });

          return {
            resultId: id,
            fileName,
            mime: OUTPUT_MIME.pdf,
            size: pdfBuffer.byteLength,
            width: pngMeta.width || width,
            height: pngMeta.height || height,
            inputFormat: sourceFormat,
            outputFormat: "pdf",
          };
        }

        const hasAlpha = Boolean(meta.hasAlpha);
        const encoded = await encodeImage(pipeline, outputFormat, options.format, hasAlpha);

        let outWidth = encoded.width || width;
        let outHeight = encoded.height || height;
        try {
          const outMeta = await sharp(encoded.buffer).metadata();
          outWidth = outMeta.width || outWidth;
          outHeight = outMeta.height || outHeight;
        } catch {
          /* BMP/ICO custom — keep dims from encoder */
        }

        const { id, dir } = await createWorkDir();
        const fileName = buildOutputFileName(
          sanitizeFileName(originalName),
          OUTPUT_EXTENSION[outputFormat],
        );
        const filePath = path.join(dir, fileName);
        await fs.writeFile(filePath, encoded.buffer);

        let previewBase64: string | undefined;
        try {
          const previewSource = encoded.previewPng || encoded.buffer;
          const preview = await sharp(previewSource)
            .resize({ width: 480, withoutEnlargement: true })
            .png()
            .toBuffer();
          previewBase64 = `data:image/png;base64,${preview.toString("base64")}`;
        } catch {
          previewBase64 = undefined;
        }

        await saveResult({
          id,
          filePath,
          fileName,
          mime: encoded.mime,
          size: encoded.buffer.byteLength,
          width: outWidth,
          height: outHeight,
          inputFormat: sourceFormat,
          outputFormat,
        });

        return {
          resultId: id,
          fileName,
          mime: encoded.mime,
          size: encoded.buffer.byteLength,
          width: outWidth,
          height: outHeight,
          inputFormat: sourceFormat,
          outputFormat,
          previewBase64,
        };
      } catch (error) {
        if (error instanceof AppError) throw error;
        logTechnical("convert.single", error, { originalName, outputFormat });
        const mapped = toUserError(error);
        throw new AppError(mapped.message, mapped.code, 422);
      }
    })(),
    DEFAULT_LIMITS.processingTimeoutMs,
  );
}

export async function convertMergedPdf(params: {
  files: Array<{ buffer: Buffer; originalName: string; id: string }>;
  options: ConvertOptions;
  order: string[];
}): Promise<{
  resultId: string;
  fileName: string;
  mime: string;
  size: number;
  width: number;
  height: number;
  inputFormat: string;
  outputFormat: string;
}> {
  if (!DEFAULT_LIMITS.pdfEnabled) {
    throw new AppError(UserMessages.pdfDisabled, "PDF_DISABLED", 403);
  }

  return withTimeout(
    (async () => {
      const byId = new Map(params.files.map((f) => [f.id, f]));
      const ordered =
        params.order.length > 0
          ? params.order.map((id) => byId.get(id)).filter(Boolean)
          : params.files;

      const pages = [];
      for (const file of ordered) {
        if (!file) continue;
        const detected = detectFormatFromBuffer(file.buffer);
        if (!detected) throw new AppError(UserMessages.unsupported, "UNSUPPORTED", 415);
        const raster = await toRasterBuffer(file.buffer, detected);
        let pipeline = sharp(raster, { failOn: "none" }).rotate();
        pipeline = await applyResize(pipeline, params.options.resize);
        const png = await pipeline.png().toBuffer();
        const meta = await sharp(png).metadata();
        pages.push({
          buffer: png,
          width: meta.width || 1,
          height: meta.height || 1,
        });
      }

      const pdfBuffer = await imagesToPdf(pages, params.options.format);
      const { id, dir } = await createWorkDir();
      const fileName = `imagens-${randomUUID().slice(0, 8)}.pdf`;
      const filePath = path.join(dir, fileName);
      await fs.writeFile(filePath, pdfBuffer);
      await saveResult({
        id,
        filePath,
        fileName,
        mime: OUTPUT_MIME.pdf,
        size: pdfBuffer.byteLength,
        width: pages[0]?.width || 0,
        height: pages[0]?.height || 0,
        inputFormat: "mixed",
        outputFormat: "pdf",
      });

      return {
        resultId: id,
        fileName,
        mime: OUTPUT_MIME.pdf,
        size: pdfBuffer.byteLength,
        width: pages[0]?.width || 0,
        height: pages[0]?.height || 0,
        inputFormat: "mixed",
        outputFormat: "pdf",
      };
    })(),
    DEFAULT_LIMITS.processingTimeoutMs * 2,
  );
}
