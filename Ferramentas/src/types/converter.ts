export type InputFormat =
  | "jpg"
  | "jpeg"
  | "png"
  | "webp"
  | "heic"
  | "heif"
  | "avif"
  | "bmp"
  | "tiff"
  | "gif"
  | "ico"
  | "svg";

export type OutputFormat =
  | "jpg"
  | "png"
  | "webp"
  | "avif"
  | "bmp"
  | "tiff"
  | "ico"
  | "pdf";

export type ResizeMode =
  | "original"
  | "width"
  | "height"
  | "both"
  | "fit";

export type PdfMode = "single" | "merged";

export type FileStatus =
  | "pending"
  | "validating"
  | "ready"
  | "converting"
  | "done"
  | "error"
  | "cancelled";

export interface ResizeOptions {
  mode: ResizeMode;
  width?: number;
  height?: number;
  keepAspectRatio: boolean;
  withoutEnlargement: boolean;
}

export interface FormatOptions {
  quality: number;
  background: string;
  stripMetadata: boolean;
  preserveMetadata: boolean;
  preserveTransparency: boolean;
  lossless: boolean;
  pngCompressionLevel: number;
  pdfMode: PdfMode;
  pdfOrientation: "portrait" | "landscape" | "auto";
  pdfFitToPage: boolean;
  pdfPreserveAspect: boolean;
  pdfPageOrder: string[];
}

export type InputFormatChoice = "auto" | InputFormat;

export interface ConvertOptions {
  outputFormat: OutputFormat;
  /** When not "auto", forces the conversion path for the source format. */
  inputFormat: InputFormatChoice;
  resize: ResizeOptions;
  format: FormatOptions;
}

export interface QueuedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  typeHint: string;
  detectedFormat?: InputFormat;
  /** Effective source format used for conversion (manual override or detected). */
  sourceFormat?: InputFormat;
  width?: number;
  height?: number;
  previewUrl?: string;
  status: FileStatus;
  progress: number;
  error?: string;
  outputFormat?: OutputFormat;
  resultId?: string;
  resultName?: string;
  resultSize?: number;
  resultWidth?: number;
  resultHeight?: number;
  resultMime?: string;
  resultPreviewUrl?: string;
}

export interface ConvertSuccess {
  ok: true;
  resultId: string;
  fileName: string;
  mime: string;
  size: number;
  width: number;
  height: number;
  inputFormat: string;
  outputFormat: string;
  previewBase64?: string;
}

export interface ConvertFailure {
  ok: false;
  error: string;
  code: string;
}

export type ConvertResponse = ConvertSuccess | ConvertFailure;

export interface AppLimits {
  maxFiles: number;
  maxFileBytes: number;
  maxBatchBytes: number;
  retentionMs: number;
  processingTimeoutMs: number;
  pdfEnabled: boolean;
  enabledOutputFormats: OutputFormat[];
  enabledInputFormats: InputFormat[];
}
