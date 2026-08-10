import JSZip from "jszip";
import fs from "fs/promises";
import { getResult } from "@/services/storage";
import { AppError, UserMessages } from "@/lib/errors";

export async function zipResults(resultIds: string[]): Promise<{ buffer: Buffer; fileName: string }> {
  const unique = [...new Set(resultIds)].filter(Boolean);
  if (!unique.length) {
    throw new AppError("Nenhum arquivo convertido para compactar.", "EMPTY_ZIP", 400);
  }

  const zip = new JSZip();
  const usedNames = new Set<string>();
  let added = 0;

  for (const id of unique) {
    const item = getResult(id);
    if (!item) continue;
    let name = item.fileName;
    if (usedNames.has(name)) {
      const stamp = id.slice(0, 6);
      name = name.replace(/(\.[^.]+)$/, `-${stamp}$1`);
    }
    usedNames.add(name);
    const data = await fs.readFile(item.filePath);
    zip.file(name, data);
    added += 1;
  }

  if (!added) {
    throw new AppError(UserMessages.notFound, "NOT_FOUND", 404);
  }

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return { buffer, fileName: `imagens-convertidas-${Date.now()}.zip` };
}
