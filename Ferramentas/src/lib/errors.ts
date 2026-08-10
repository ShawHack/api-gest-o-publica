export class AppError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export const UserMessages = {
  unsupported: "Formato não suportado. Envie uma imagem válida (JPG, PNG, WEBP, HEIC, etc.).",
  corrupt: "Arquivo corrompido ou ilegível. Tente exportar a imagem novamente e reenviar.",
  tooLarge: "Arquivo muito grande para o limite configurado.",
  batchTooLarge: "O tamanho total do lote ultrapassa o limite permitido.",
  tooMany: "Quantidade de arquivos acima do limite permitido.",
  convertFailed: "Falha durante a conversão. Tente novamente ou escolha outro formato.",
  memory: "Não foi possível processar esta imagem por falta de memória. Reduza o tamanho.",
  network: "Falha de comunicação com o servidor. Verifique a conexão e tente de novo.",
  incompatible: "Conversão incompatível entre os formatos selecionados.",
  timeout: "Tempo limite excedido ao processar este arquivo.",
  dangerous: "Arquivo bloqueado por segurança.",
  heicFailed: "Não foi possível decodificar este arquivo HEIC/HEIF.",
  pdfDisabled: "Conversão para PDF está desativada.",
  notFound: "Arquivo temporário não encontrado ou já expirado.",
  libreOfficeMissing:
    "LibreOffice não encontrado. Instale o LibreOffice (Windows Program Files, Linux/Docker: SOFFICE_PATH ou /usr/bin/soffice) para converter documentos Office/HTML.",
  libreOfficeFailed: "Falha ao converter o arquivo com o LibreOffice. Verifique o formato e tente novamente.",
  pdfEmpty: "É necessário pelo menos um PDF válido para esta operação.",
  pdfInvalid: "PDF inválido ou corrompido. Verifique o arquivo e tente novamente.",
  pdfRangeInvalid: "Intervalo de páginas inválido. Use formatos como 1-3,5 ou 2,4-6.",
  pdfPageOutOfRange: "Uma ou mais páginas solicitadas estão fora do intervalo do documento.",
  pdfPasswordRequired: "Este PDF está protegido por senha. Informe a senha correta.",
  pdfPasswordWrong: "Senha incorreta para este PDF.",
  pdfProtectFailed: "Não foi possível proteger o PDF com senha. Tente novamente.",
  pdfUnlockFailed: "Não foi possível remover a proteção do PDF. Verifique a senha.",
  pdfCompressFailed: "Falha ao compactar o PDF. Tente outro nível ou outro arquivo.",
  pdfEditFailed: "Falha ao editar o PDF. Verifique as páginas e tente novamente.",
  pdfSignFailed: "Falha ao assinar o PDF. Use uma imagem PNG ou JPG válida.",
  pdfWatermarkFailed: "Falha ao aplicar a marca d'água no PDF.",
  pdfHtmlEmpty: "Conteúdo HTML vazio. Envie HTML válido para converter em PDF.",
} as const;

export function toUserError(error: unknown): { message: string; code: string } {
  if (error instanceof AppError) {
    return { message: error.message, code: error.code };
  }

  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  if (lower.includes("timeout") || lower.includes("timed out")) {
    return { message: UserMessages.timeout, code: "TIMEOUT" };
  }
  if (lower.includes("heic") || lower.includes("heif")) {
    return { message: UserMessages.heicFailed, code: "HEIC_DECODE" };
  }
  if (lower.includes("memory") || lower.includes("heap") || lower.includes("allocation")) {
    return { message: UserMessages.memory, code: "MEMORY" };
  }
  if (lower.includes("unsupported") || lower.includes("VipsError".toLowerCase())) {
    return { message: UserMessages.convertFailed, code: "CONVERT_FAILED" };
  }
  if (lower.includes("corrupt") || lower.includes("invalid") || lower.includes("premature")) {
    return { message: UserMessages.corrupt, code: "CORRUPT" };
  }
  if (lower.includes("password") || lower.includes("encrypted")) {
    return { message: UserMessages.pdfPasswordWrong, code: "PDF_PASSWORD_WRONG" };
  }
  if (lower.includes("libreoffice") || lower.includes("soffice")) {
    return { message: UserMessages.libreOfficeFailed, code: "LIBREOFFICE_FAILED" };
  }

  return { message: UserMessages.convertFailed, code: "CONVERT_FAILED" };
}

export function logTechnical(scope: string, error: unknown, meta?: Record<string, unknown>) {
  const payload = {
    scope,
    at: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...meta,
  };
  console.error("[converter]", JSON.stringify(payload));
}
