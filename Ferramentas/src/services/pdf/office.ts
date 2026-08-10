import path from "node:path";
import { AppError, UserMessages } from "@/lib/errors";
import { convertPdfTo, convertToPdf } from "./libreoffice";

const WORD_EXT = new Set([".doc", ".docx", ".odt", ".rtf"]);
const EXCEL_EXT = new Set([".xls", ".xlsx", ".ods", ".csv"]);
const PPT_EXT = new Set([".ppt", ".pptx", ".odp"]);

function ensureExt(fileName: string, allowed: Set<string>, label: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (!allowed.has(ext)) {
    throw new AppError(
      `Envie um arquivo ${label} válido (${[...allowed].join(", ")}).`,
      "INCOMPATIBLE",
      400,
    );
  }
}

export async function wordToPdf(buffer: Buffer, fileName: string): Promise<Buffer> {
  if (!buffer?.length) throw new AppError(UserMessages.pdfEmpty, "PDF_EMPTY", 400);
  ensureExt(fileName, WORD_EXT, "Word");
  return convertToPdf(buffer, fileName);
}

export async function excelToPdf(buffer: Buffer, fileName: string): Promise<Buffer> {
  if (!buffer?.length) throw new AppError(UserMessages.pdfEmpty, "PDF_EMPTY", 400);
  ensureExt(fileName, EXCEL_EXT, "Excel");
  return convertToPdf(buffer, fileName);
}

export async function pptToPdf(buffer: Buffer, fileName: string): Promise<Buffer> {
  if (!buffer?.length) throw new AppError(UserMessages.pdfEmpty, "PDF_EMPTY", 400);
  ensureExt(fileName, PPT_EXT, "PowerPoint");
  return convertToPdf(buffer, fileName);
}

export async function pdfToWord(buffer: Buffer): Promise<Buffer> {
  if (!buffer?.length) throw new AppError(UserMessages.pdfEmpty, "PDF_EMPTY", 400);
  return convertPdfTo(buffer, "docx");
}

export async function pdfToExcel(buffer: Buffer): Promise<Buffer> {
  if (!buffer?.length) throw new AppError(UserMessages.pdfEmpty, "PDF_EMPTY", 400);
  return convertPdfTo(buffer, "xlsx");
}

export async function pdfToPpt(buffer: Buffer): Promise<Buffer> {
  if (!buffer?.length) throw new AppError(UserMessages.pdfEmpty, "PDF_EMPTY", 400);
  return convertPdfTo(buffer, "pptx");
}
