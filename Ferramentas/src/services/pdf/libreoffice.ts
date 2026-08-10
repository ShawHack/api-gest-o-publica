import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { AppError, UserMessages, logTechnical } from "@/lib/errors";
import { createWorkDir } from "@/services/storage";

const CONVERT_TIMEOUT_MS = 120_000;

const SOFFICE_CANDIDATES = [
  process.env.SOFFICE_PATH,
  "/usr/bin/soffice",
  "/usr/lib/libreoffice/program/soffice",
  path.join(process.env["ProgramFiles"] ?? "C:\\Program Files", "LibreOffice", "program", "soffice.exe"),
  path.join(
    process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)",
    "LibreOffice",
    "program",
    "soffice.exe",
  ),
].filter((p): p is string => Boolean(p));

const OFFICE_TO_PDF_EXT = new Set([
  ".doc",
  ".docx",
  ".odt",
  ".rtf",
  ".txt",
  ".html",
  ".htm",
  ".xls",
  ".xlsx",
  ".ods",
  ".csv",
  ".ppt",
  ".pptx",
  ".odp",
]);

const PDF_EXPORT_FORMATS = new Set(["docx", "pptx", "xlsx", "odt", "ods", "odp", "html", "txt", "rtf"]);

let cachedSoffice: string | null | undefined;

export function findSoffice(): string {
  if (cachedSoffice) return cachedSoffice;
  if (cachedSoffice === null) {
    throw new AppError(UserMessages.libreOfficeMissing, "LIBREOFFICE_MISSING", 503);
  }

  const envPath = process.env.SOFFICE_PATH;
  if (envPath && existsSync(envPath)) {
    cachedSoffice = envPath;
    return envPath;
  }

  for (const candidate of SOFFICE_CANDIDATES) {
    if (existsSync(candidate)) {
      cachedSoffice = candidate;
      return candidate;
    }
  }

  cachedSoffice = null;
  throw new AppError(UserMessages.libreOfficeMissing, "LIBREOFFICE_MISSING", 503);
}

export function isLibreOfficeAvailable(): boolean {
  try {
    findSoffice();
    return true;
  } catch {
    return false;
  }
}

async function runSoffice(args: string[], cwd?: string): Promise<void> {
  const soffice = findSoffice();

  await new Promise<void>((resolve, reject) => {
    const child = spawn(soffice, args, {
      cwd,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        // Reduz conflitos de perfil do LibreOffice em Windows.
        SAL_USE_VCLPLUGIN: process.env.SAL_USE_VCLPLUGIN || "svp",
      },
    });

    let stderr = "";
    let stdout = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new AppError(UserMessages.timeout, "TIMEOUT", 408));
    }, CONVERT_TIMEOUT_MS);

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      logTechnical("libreoffice.spawn", err, { soffice, args });
      reject(new AppError(UserMessages.libreOfficeMissing, "LIBREOFFICE_MISSING", 503));
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }
      logTechnical("libreoffice.exit", new Error(`exit ${code}`), {
        args,
        stderr: stderr.slice(0, 2000),
        stdout: stdout.slice(0, 1000),
      });
      reject(new AppError(UserMessages.libreOfficeFailed, "LIBREOFFICE_FAILED", 400));
    });
  });
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const { dir } = await createWorkDir();
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function findConvertedOutput(
  outdir: string,
  preferredExt: string,
  baseName: string,
): Promise<string> {
  const ext = preferredExt.replace(/^\./, "").toLowerCase();
  const expected = path.join(outdir, `${baseName}.${ext}`);
  if (existsSync(expected)) return expected;

  const entries = await fs.readdir(outdir);
  const match = entries.find((name) => name.toLowerCase().endsWith(`.${ext}`));
  if (match) return path.join(outdir, match);

  throw new AppError(UserMessages.libreOfficeFailed, "LIBREOFFICE_FAILED", 400);
}

function userProfileArg(profileDir: string): string {
  // LibreOffice expects a file:// URL for UserInstallation.
  const url = pathToFileURL(profileDir).href;
  return `-env:UserInstallation=${url}`;
}

/**
 * Converts an Office/HTML/text file buffer to PDF via LibreOffice.
 */
export async function convertToPdf(input: Buffer, inputFileName: string): Promise<Buffer> {
  const ext = path.extname(inputFileName).toLowerCase() || ".bin";
  if (!OFFICE_TO_PDF_EXT.has(ext) && ext !== ".pdf") {
    throw new AppError(UserMessages.incompatible, "INCOMPATIBLE", 400);
  }

  return withTempDir(async (dir) => {
    const profileDir = path.join(dir, "profile");
    await fs.mkdir(profileDir, { recursive: true });
    const safeBase = "input";
    const inputPath = path.join(dir, `${safeBase}${ext}`);
    await fs.writeFile(inputPath, input);

    await runSoffice(
      [
        userProfileArg(profileDir),
        "--headless",
        "--norestore",
        "--nolockcheck",
        "--nodefault",
        "--convert-to",
        "pdf",
        "--outdir",
        dir,
        inputPath,
      ],
      dir,
    );

    const outPath = await findConvertedOutput(dir, "pdf", safeBase);
    return fs.readFile(outPath);
  });
}

/**
 * Converts a PDF buffer to another format (docx, pptx, xlsx, …).
 * Usa writer_pdf_import — necessário no Windows para PDF → Office.
 */
export async function convertPdfTo(pdfBuffer: Buffer, targetFormat: string): Promise<Buffer> {
  const format = targetFormat.toLowerCase().replace(/^\./, "");
  if (!PDF_EXPORT_FORMATS.has(format)) {
    throw new AppError(
      `Formato de exportação não suportado via LibreOffice: ${format}. Use docx, pptx ou xlsx.`,
      "INCOMPATIBLE",
      400,
    );
  }

  return withTempDir(async (dir) => {
    const profileDir = path.join(dir, "profile");
    await fs.mkdir(profileDir, { recursive: true });
    const inputPath = path.join(dir, "input.pdf");
    await fs.writeFile(inputPath, pdfBuffer);

    // Tentativas em ordem: o filtro writer_pdf_import é o que funciona no Windows.
    const attempts: string[][] = [
      [
        userProfileArg(profileDir),
        "--headless",
        "--norestore",
        "--nolockcheck",
        "--nodefault",
        "--infilter=writer_pdf_import",
        "--convert-to",
        format,
        "--outdir",
        dir,
        inputPath,
      ],
      [
        userProfileArg(profileDir),
        "--headless",
        "--norestore",
        "--nolockcheck",
        "--nodefault",
        "--infilter=draw_pdf_import",
        "--convert-to",
        format,
        "--outdir",
        dir,
        inputPath,
      ],
      [
        userProfileArg(profileDir),
        "--headless",
        "--norestore",
        "--nolockcheck",
        "--nodefault",
        "--convert-to",
        format,
        "--outdir",
        dir,
        inputPath,
      ],
    ];

    let lastError: unknown;
    for (const args of attempts) {
      try {
        await runSoffice(args, dir);
        const outPath = await findConvertedOutput(dir, format, "input");
        return fs.readFile(outPath);
      } catch (error) {
        lastError = error;
        logTechnical("libreoffice.pdfTo.retry", error, { format, args: args.slice(0, 8) });
      }
    }

    if (lastError instanceof AppError) throw lastError;
    throw new AppError(UserMessages.libreOfficeFailed, "LIBREOFFICE_FAILED", 400);
  });
}

/**
 * Re-exports / rewrites a PDF through LibreOffice (useful for compression).
 */
export async function rewritePdfViaLibreOffice(
  pdfBuffer: Buffer,
  pdfFilter?: string,
): Promise<Buffer> {
  return withTempDir(async (dir) => {
    const profileDir = path.join(dir, "profile");
    await fs.mkdir(profileDir, { recursive: true });
    const inputPath = path.join(dir, "input.pdf");
    await fs.writeFile(inputPath, pdfBuffer);

    const convertTo = pdfFilter ? `pdf:${pdfFilter}` : "pdf";
    await runSoffice(
      [
        userProfileArg(profileDir),
        "--headless",
        "--norestore",
        "--nolockcheck",
        "--nodefault",
        "--convert-to",
        convertTo,
        "--outdir",
        dir,
        inputPath,
      ],
      dir,
    );

    const outPath = await findConvertedOutput(dir, "pdf", "input");
    return fs.readFile(outPath);
  });
}
