import type { ConvertOptions, InputFormat, OutputFormat } from "@/types/converter";
// keeps InputFormatChoice available via ConvertOptions.inputFormat

export const INPUT_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.heic,.heif,.avif,.bmp,.tif,.tiff,.gif,.ico,.svg,image/*";

export const OUTPUT_FORMAT_LABELS: Record<OutputFormat, string> = {
  jpg: "JPG",
  png: "PNG",
  webp: "WEBP",
  avif: "AVIF",
  bmp: "BMP",
  tiff: "TIFF",
  ico: "ICO",
  pdf: "PDF",
};

export const INPUT_FORMAT_LABELS: Record<InputFormat, string> = {
  jpg: "JPG",
  jpeg: "JPEG",
  png: "PNG",
  webp: "WEBP",
  heic: "HEIC",
  heif: "HEIF",
  avif: "AVIF",
  bmp: "BMP",
  tiff: "TIFF",
  gif: "GIF",
  ico: "ICO",
  svg: "SVG",
};

export const OUTPUT_EXTENSION: Record<OutputFormat, string> = {
  jpg: "jpg",
  png: "png",
  webp: "webp",
  avif: "avif",
  bmp: "bmp",
  tiff: "tiff",
  ico: "ico",
  pdf: "pdf",
};

export const OUTPUT_MIME: Record<OutputFormat, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  bmp: "image/bmp",
  tiff: "image/tiff",
  ico: "image/x-icon",
  pdf: "application/pdf",
};

const TRANSPARENCY_OUTPUTS = new Set<OutputFormat>(["png", "webp", "avif", "gif" as never, "ico"]);

export function supportsTransparency(format: OutputFormat): boolean {
  return TRANSPARENCY_OUTPUTS.has(format);
}

/** Combinations that are unreliable or produce invalid results. */
export function isConversionAllowed(
  input: InputFormat,
  output: OutputFormat,
): { ok: true } | { ok: false; reason: string } {
  if (input === "svg" && (output === "ico" || output === "tiff" || output === "bmp")) {
    return {
      ok: false,
      reason:
        "SVG vetorial não é compatível com este formato de saída. Converta para PNG, JPG, WEBP, AVIF ou PDF.",
    };
  }

  if ((input === "heic" || input === "heif") && output === "ico") {
    return {
      ok: false,
      reason: "HEIC/HEIF não pode ser convertido diretamente para ICO. Use PNG ou JPG.",
    };
  }

  if (input === "gif" && output === "ico") {
    return {
      ok: false,
      reason: "GIF animado não é compatível com ICO. Converta primeiro para PNG.",
    };
  }

  return { ok: true };
}

export function normalizeInputFormat(format: string): InputFormat | null {
  const f = format.toLowerCase().replace("image/", "").replace(".", "");
  if (f === "jpeg" || f === "jpg") return f === "jpg" ? "jpg" : "jpeg";
  if (f === "tif") return "tiff";
  if (f === "svg+xml") return "svg";
  if (f === "x-icon" || f === "vnd.microsoft.icon") return "ico";
  const allowed: InputFormat[] = [
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
  ];
  return (allowed.includes(f as InputFormat) ? f : null) as InputFormat | null;
}

export function defaultConvertOptions(output: OutputFormat = "png"): ConvertOptions {
  return {
    outputFormat: output,
    inputFormat: "auto",
    resize: {
      mode: "original",
      keepAspectRatio: true,
      withoutEnlargement: true,
    },
    format: {
      quality: 90,
      background: "#ffffff",
      stripMetadata: true,
      preserveMetadata: false,
      preserveTransparency: true,
      lossless: false,
      pngCompressionLevel: 6,
      pdfMode: "single",
      pdfOrientation: "auto",
      pdfFitToPage: true,
      pdfPreserveAspect: true,
      pdfPageOrder: [],
    },
  };
}

/** Formats shown in the "origem" dropdown (jpeg aliased under jpg). */
export const INPUT_FORMAT_CHOICES: Array<{ value: InputFormat; label: string }> = [
  { value: "jpg", label: "JPG / JPEG" },
  { value: "png", label: "PNG" },
  { value: "webp", label: "WEBP" },
  { value: "heic", label: "HEIC" },
  { value: "heif", label: "HEIF" },
  { value: "avif", label: "AVIF" },
  { value: "bmp", label: "BMP" },
  { value: "tiff", label: "TIFF" },
  { value: "gif", label: "GIF" },
  { value: "ico", label: "ICO" },
  { value: "svg", label: "SVG" },
];
