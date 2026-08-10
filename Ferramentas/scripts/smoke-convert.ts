/**
 * Smoke tests for conversion service (Node).
 * Run: npx tsx scripts/smoke-convert.ts
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { convertSingleImage, convertMergedPdf } from "../src/services/conversion";
import { defaultConvertOptions } from "../src/lib/formats";
import { detectFormatFromBuffer } from "../src/lib/detect-format";

async function makePng(name: string, color: { r: number; g: number; b: number; alpha?: number }) {
  const buffer = await sharp({
    create: {
      width: 120,
      height: 80,
      channels: 4,
      background: { r: color.r, g: color.g, b: color.b, alpha: color.alpha ?? 1 },
    },
  })
    .png()
    .toBuffer();
  return { name, buffer };
}

async function makeJpg(name: string) {
  const buffer = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 30, g: 120, b: 200 },
    },
  })
    .jpeg({ quality: 85 })
    .toBuffer();
  return { name, buffer };
}

async function makeWebp(name: string) {
  const buffer = await sharp({
    create: {
      width: 90,
      height: 90,
      channels: 4,
      background: { r: 10, g: 180, b: 90, alpha: 0.5 },
    },
  })
    .webp()
    .toBuffer();
  return { name, buffer };
}

async function run() {
  const outDir = path.join(process.cwd(), ".smoke-out");
  await fs.mkdir(outDir, { recursive: true });

  const cases: Array<() => Promise<void>> = [];

  cases.push(async () => {
    const png = await makePng("alpha.png", { r: 0, g: 0, b: 0, alpha: 0 });
    const r = await convertSingleImage({
      buffer: png.buffer,
      originalName: png.name,
      options: {
        ...defaultConvertOptions("jpg"),
        format: { ...defaultConvertOptions("jpg").format, background: "#ff0000" },
      },
    });
    console.log("PNG→JPG", r.fileName, r.size);
  });

  cases.push(async () => {
    const jpg = await makeJpg("photo.jpg");
    const r = await convertSingleImage({
      buffer: jpg.buffer,
      originalName: jpg.name,
      options: defaultConvertOptions("png"),
    });
    console.log("JPG→PNG", r.fileName, r.size, detectFormatFromBuffer(jpg.buffer));
  });

  cases.push(async () => {
    const png = await makePng("solid.png", { r: 255, g: 128, b: 0 });
    const r = await convertSingleImage({
      buffer: png.buffer,
      originalName: png.name,
      options: defaultConvertOptions("webp"),
    });
    console.log("PNG→WEBP", r.fileName, r.size);
  });

  cases.push(async () => {
    const webp = await makeWebp("soft.webp");
    const r = await convertSingleImage({
      buffer: webp.buffer,
      originalName: webp.name,
      options: defaultConvertOptions("png"),
    });
    console.log("WEBP→PNG", r.fileName, r.size);
  });

  cases.push(async () => {
    const jpg = await makeJpg("to-webp.jpg");
    const r = await convertSingleImage({
      buffer: jpg.buffer,
      originalName: jpg.name,
      options: defaultConvertOptions("webp"),
    });
    console.log("JPG→WEBP", r.fileName, r.size);
  });

  cases.push(async () => {
    const a = await makePng("p1.png", { r: 255, g: 0, b: 0 });
    const b = await makePng("p2.png", { r: 0, g: 0, b: 255 });
    const r = await convertMergedPdf({
      files: [
        { buffer: a.buffer, originalName: a.name, id: "1" },
        { buffer: b.buffer, originalName: b.name, id: "2" },
      ],
      options: defaultConvertOptions("pdf"),
      order: ["1", "2"],
    });
    console.log("MERGED PDF", r.fileName, r.size);
  });

  cases.push(async () => {
    const corrupt = Buffer.from("not-an-image");
    try {
      await convertSingleImage({
        buffer: corrupt,
        originalName: "bad.bin",
        options: defaultConvertOptions("png"),
      });
      console.error("CORRUPT should have failed");
    } catch (e) {
      console.log("CORRUPT ok:", e instanceof Error ? e.message : e);
    }
  });

  for (const c of cases) {
    await c();
  }

  console.log("Smoke tests finished.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
