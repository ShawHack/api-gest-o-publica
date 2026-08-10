import type { AppLimits, InputFormat, OutputFormat } from "@/types/converter";

export const DEFAULT_LIMITS: AppLimits = {
  maxFiles: 30,
  maxFileBytes: 40 * 1024 * 1024,
  maxBatchBytes: 200 * 1024 * 1024,
  retentionMs: 60 * 60 * 1000,
  processingTimeoutMs: 90_000,
  pdfEnabled: true,
  enabledInputFormats: [
    "jpg",
    "jpeg",
    "png",
    "webp",
    "heic",
    "heif",
    "avif",
    "bmp",
    "tiff",
    "gif",
    "ico",
    "svg",
  ],
  enabledOutputFormats: ["jpg", "png", "webp", "avif", "bmp", "tiff", "ico", "pdf"],
};

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function sizeDeltaPercent(original: number, result: number): number | null {
  if (!original || !result) return null;
  return Math.round(((result - original) / original) * 100);
}

export function isOutputEnabled(
  format: OutputFormat,
  limits: AppLimits = DEFAULT_LIMITS,
): boolean {
  if (format === "pdf" && !limits.pdfEnabled) return false;
  return limits.enabledOutputFormats.includes(format);
}

export function isInputEnabled(
  format: InputFormat,
  limits: AppLimits = DEFAULT_LIMITS,
): boolean {
  return limits.enabledInputFormats.includes(format);
}
