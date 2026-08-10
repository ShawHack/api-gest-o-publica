import fs from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { DEFAULT_LIMITS } from "@/lib/limits";

const ROOT = path.join(os.tmpdir(), "semit-image-converter");

export interface StoredResult {
  id: string;
  filePath: string;
  fileName: string;
  mime: string;
  size: number;
  width: number;
  height: number;
  inputFormat: string;
  outputFormat: string;
  createdAt: number;
  previewPath?: string;
}

const registry = new Map<string, StoredResult>();

export async function ensureTempRoot() {
  await fs.mkdir(ROOT, { recursive: true });
}

export function getTempRoot() {
  return ROOT;
}

export async function createWorkDir(): Promise<{ id: string; dir: string }> {
  await ensureTempRoot();
  const id = randomUUID();
  const dir = path.join(ROOT, id);
  await fs.mkdir(dir, { recursive: true });
  return { id, dir };
}

export async function saveResult(meta: Omit<StoredResult, "createdAt">): Promise<StoredResult> {
  const stored: StoredResult = { ...meta, createdAt: Date.now() };
  registry.set(stored.id, stored);
  return stored;
}

export function getResult(id: string): StoredResult | undefined {
  const item = registry.get(id);
  if (!item) return undefined;
  if (Date.now() - item.createdAt > DEFAULT_LIMITS.retentionMs) {
    void deleteResult(id);
    return undefined;
  }
  return item;
}

export async function deleteResult(id: string) {
  const item = registry.get(id);
  registry.delete(id);
  if (!item) return;
  try {
    await fs.rm(path.dirname(item.filePath), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

export async function cleanupExpired(retentionMs = DEFAULT_LIMITS.retentionMs) {
  await ensureTempRoot();
  const now = Date.now();

  for (const [id, item] of registry.entries()) {
    if (now - item.createdAt > retentionMs) {
      await deleteResult(id);
    }
  }

  // Also remove orphan directories
  try {
    const entries = await fs.readdir(ROOT, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(ROOT, entry.name);
      const stat = await fs.stat(dir);
      if (now - stat.mtimeMs > retentionMs) {
        await fs.rm(dir, { recursive: true, force: true });
        registry.delete(entry.name);
      }
    }
  } catch {
    /* ignore */
  }
}

let cleanupStarted = false;

export function startCleanupScheduler() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  void cleanupExpired();
  setInterval(() => {
    void cleanupExpired();
  }, 5 * 60 * 1000).unref?.();
}
