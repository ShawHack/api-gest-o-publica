import type { InputFormat } from "@/types/converter";

function ascii(buf: Buffer, start: number, length: number): string {
  return buf.subarray(start, start + length).toString("ascii");
}

function looksLikeSvg(buf: Buffer): boolean {
  const sample = buf
    .subarray(0, Math.min(buf.length, 2048))
    .toString("utf8")
    .trim()
    .toLowerCase();
  return sample.includes("<svg") || (sample.startsWith("<?xml") && sample.includes("<svg"));
}

/**
 * Detect image format from real file content (magic bytes), not extension.
 */
export function detectFormatFromBuffer(buffer: Buffer): InputFormat | null {
  if (!buffer || buffer.length < 12) {
    if (buffer && looksLikeSvg(buffer)) return "svg";
    return null;
  }

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }

  // GIF
  const gif = ascii(buffer, 0, 6);
  if (gif === "GIF87a" || gif === "GIF89a") return "gif";

  // BMP
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) return "bmp";

  // TIFF
  if (
    (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
    (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a)
  ) {
    return "tiff";
  }

  // ICO
  if (
    buffer[0] === 0x00 &&
    buffer[1] === 0x00 &&
    buffer[2] === 0x01 &&
    buffer[3] === 0x00
  ) {
    return "ico";
  }

  // WEBP / RIFF
  if (ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 4) === "WEBP") return "webp";

  // ISO BMFF (AVIF / HEIC / HEIF)
  if (ascii(buffer, 4, 4) === "ftyp") {
    const brand = ascii(buffer, 8, 4).toLowerCase();
    const compat = ascii(buffer, 16, Math.min(12, buffer.length - 16)).toLowerCase();
    const hay = brand + compat;

    if (hay.includes("avif") || hay.includes("avis") || brand === "avif") return "avif";
    if (
      hay.includes("heic") ||
      hay.includes("heix") ||
      hay.includes("hevc") ||
      brand === "heic"
    ) {
      return "heic";
    }
    if (
      hay.includes("heif") ||
      hay.includes("mif1") ||
      hay.includes("msf1") ||
      brand === "mif1"
    ) {
      return "heif";
    }
  }

  if (looksLikeSvg(buffer)) return "svg";

  return null;
}
