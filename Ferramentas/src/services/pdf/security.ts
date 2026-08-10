import muhammara from "muhammara";
import { AppError, UserMessages, logTechnical } from "@/lib/errors";

function assertBuffer(buffer: Buffer, label: string) {
  if (!buffer || buffer.length === 0) {
    throw new AppError(UserMessages.pdfEmpty, "PDF_EMPTY", 400);
  }
  if (!Buffer.isBuffer(buffer)) {
    throw new AppError(`${label} inválido.`, "PDF_INVALID", 400);
  }
}

function recryptBuffer(
  input: Buffer,
  options: {
    password?: string;
    userPassword?: string;
    ownerPassword?: string;
    userProtectionFlag?: number;
  },
): Buffer {
  const inputStream = new muhammara.PDFRStreamForBuffer(input);
  const outputStream = new muhammara.PDFWStreamForBuffer();
  muhammara.recrypt(inputStream, outputStream, options);
  if (!outputStream.buffer || outputStream.buffer.length === 0) {
    throw new Error("muhammara retornou buffer vazio");
  }
  return Buffer.from(outputStream.buffer);
}

/**
 * Encrypts a PDF with a user password (AES via muhammara/recrypt).
 * pdf-lib does not support encryption; muhammara is used instead.
 */
export async function protectPdf(buffer: Buffer, password: string): Promise<Buffer> {
  assertBuffer(buffer, "PDF");
  if (!password || !password.trim()) {
    throw new AppError("Informe uma senha para proteger o PDF.", "PDF_PASSWORD_REQUIRED", 400);
  }

  try {
    return recryptBuffer(buffer, {
      userPassword: password,
      ownerPassword: password,
      userProtectionFlag: 4,
    });
  } catch (error) {
    logTechnical("pdf.protect", error);
    const msg = error instanceof Error ? error.message.toLowerCase() : "";
    if (msg.includes("password") || msg.includes("encrypt")) {
      throw new AppError(UserMessages.pdfPasswordRequired, "PDF_PASSWORD_REQUIRED", 400);
    }
    throw new AppError(UserMessages.pdfProtectFailed, "PDF_PROTECT_FAILED", 400);
  }
}

/**
 * Removes password protection from a PDF (muhammara recrypt with empty user/owner passwords).
 */
export async function unlockPdf(buffer: Buffer, password: string): Promise<Buffer> {
  assertBuffer(buffer, "PDF");
  if (!password) {
    throw new AppError(UserMessages.pdfPasswordRequired, "PDF_PASSWORD_REQUIRED", 400);
  }

  try {
    return recryptBuffer(buffer, {
      password,
      userPassword: "",
      ownerPassword: "",
    });
  } catch (error) {
    logTechnical("pdf.unlock", error);
    const msg = error instanceof Error ? error.message.toLowerCase() : "";
    if (msg.includes("password") || msg.includes("encrypt") || msg.includes("unable")) {
      throw new AppError(UserMessages.pdfPasswordWrong, "PDF_PASSWORD_WRONG", 400);
    }
    throw new AppError(UserMessages.pdfUnlockFailed, "PDF_UNLOCK_FAILED", 400);
  }
}
