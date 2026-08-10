/* Client-only validation — no Node Buffer */
import { isConversionAllowed } from "@/lib/formats";
import { isDangerousFileName } from "@/lib/sanitize";
import { DEFAULT_LIMITS, formatBytes } from "@/lib/limits";
import { UserMessages } from "@/lib/errors";
import type { InputFormat, OutputFormat } from "@/types/converter";

function loadImageDims(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("preview"));
    img.src = url;
  });
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function detectFromBytes(buffer: Uint8Array): InputFormat | null {
  if (buffer.length < 12) {
    const sample = new TextDecoder()
      .decode(buffer.slice(0, Math.min(buffer.length, 512)))
      .toLowerCase();
    if (sample.includes("<svg")) return "svg";
    return null;
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "png";
  }
  const gif = ascii(buffer, 0, 6);
  if (gif === "GIF87a" || gif === "GIF89a") return "gif";
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) return "bmp";
  if (
    (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
    (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a)
  ) {
    return "tiff";
  }
  if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00) {
    return "ico";
  }
  if (ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 4) === "WEBP") return "webp";
  if (ascii(buffer, 4, 4) === "ftyp") {
    const brand = ascii(buffer, 8, 4).toLowerCase();
    const compat = ascii(buffer, 16, Math.min(12, buffer.length - 16)).toLowerCase();
    const hay = brand + compat;
    if (hay.includes("avif") || hay.includes("avis")) return "avif";
    if (hay.includes("heic") || hay.includes("heix") || hay.includes("hevc")) return "heic";
    if (hay.includes("heif") || hay.includes("mif1") || hay.includes("msf1")) return "heif";
  }
  const sample = new TextDecoder()
    .decode(buffer.slice(0, Math.min(buffer.length, 2048)))
    .toLowerCase();
  if (sample.includes("<svg")) return "svg";
  return null;
}

export function checkCompatibility(input: InputFormat, output: OutputFormat) {
  return isConversionAllowed(input, output);
}

export async function inspectClientFileBrowser(file: File): Promise<
  | {
      ok: true;
      detectedFormat: InputFormat;
      width?: number;
      height?: number;
      previewUrl: string;
    }
  | { ok: false; error: string }
> {
  if (isDangerousFileName(file.name)) {
    return { ok: false, error: UserMessages.dangerous };
  }

  if (file.size > DEFAULT_LIMITS.maxFileBytes) {
    return {
      ok: false,
      error: `${UserMessages.tooLarge} Limite: ${formatBytes(DEFAULT_LIMITS.maxFileBytes)}.`,
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectFromBytes(bytes);
  if (!detected) {
    return { ok: false, error: UserMessages.corrupt };
  }

  if (detected === "heic" || detected === "heif") {
    return { ok: true, detectedFormat: detected, previewUrl: "" };
  }

  let previewUrl = "";
  try {
    previewUrl = URL.createObjectURL(file);
    const dims = await loadImageDims(previewUrl);
    return {
      ok: true,
      detectedFormat: detected,
      width: dims.width,
      height: dims.height,
      previewUrl,
    };
  } catch {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    return { ok: true, detectedFormat: detected, previewUrl: "" };
  }
}
