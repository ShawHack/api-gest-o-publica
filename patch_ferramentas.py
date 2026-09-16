import os
import json
import shutil

BASE_PATHS = [
    "/home/semit/Documentos/api-semit/Ferramentas",
    "/home/semit/Documentos/api-gestao-publica/Ferramentas"
]

SECURITY_TS_CODE = '''import { AppError, UserMessages, logTechnical } from "@/lib/errors";

function assertBuffer(buffer: Buffer, label: string) {
  if (!buffer || buffer.length === 0) {
    throw new AppError(UserMessages.pdfEmpty, "PDF_EMPTY", 400);
  }
  if (!Buffer.isBuffer(buffer)) {
    throw new AppError(`${label} inválido.`, "PDF_INVALID", 400);
  }
}

async function getMuhammara() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import("muhammara");
  return mod.default || mod;
}

async function recryptBuffer(
  input: Buffer,
  options: {
    password?: string;
    userPassword?: string;
    ownerPassword?: string;
    userProtectionFlag?: number;
  },
): Promise<Buffer> {
  const muhammara = await getMuhammara();
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
    return await recryptBuffer(buffer, {
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
    return await recryptBuffer(buffer, {
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
'''

DOCKERFILE_CODE = '''FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \\
    libreoffice \\
    fonts-liberation \\
    fonts-dejavu \\
    ca-certificates \\
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV SOFFICE_PATH=/usr/bin/soffice
ENV NEXT_TELEMETRY_DISABLED=1
ENV MONGODB_URI=mongodb://mongo:27017/apicemiterio?replicaSet=rs0
ENV API_INTERNAL_URL=http://api:5000

COPY package.json package-lock.json* ./
RUN mkdir -p public && npm ci

COPY . .
RUN npm run test:smoke \\
  && npm run build \\
  && npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 3000
CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
'''

for bp in BASE_PATHS:
    if not os.path.isdir(bp):
        print(f"Skipping {bp}")
        continue

    print(f"Patching {bp}...")
    
    # 1. Revert package.json to match package-lock.json
    pkg_path = os.path.join(bp, "package.json")
    if os.path.exists(pkg_path):
        with open(pkg_path, "r", encoding="utf-8") as f:
            pkg = json.load(f)
        deps = pkg.get("dependencies", {})
        if "@mapbox/node-pre-gyp" in deps:
            del deps["@mapbox/node-pre-gyp"]
            pkg["dependencies"] = deps
            with open(pkg_path, "w", encoding="utf-8") as f:
                json.dump(pkg, f, indent=2)
            print("  Reverted package.json @mapbox/node-pre-gyp to sync with package-lock")

    # 2. Update security.ts
    sec_path = os.path.join(bp, "src", "services", "pdf", "security.ts")
    if os.path.exists(sec_path):
        with open(sec_path, "w", encoding="utf-8") as f:
            f.write(SECURITY_TS_CODE)
        print("  Updated security.ts")

    # 3. Update Dockerfile
    dkr_path = os.path.join(bp, "Dockerfile")
    if os.path.exists(dkr_path):
        with open(dkr_path, "w", encoding="utf-8") as f:
            f.write(DOCKERFILE_CODE)
        print("  Updated Dockerfile")

print("Done.")
