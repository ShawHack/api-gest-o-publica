import sharp from "sharp";
import { convertSingleImage } from "../src/services/conversion";
import { defaultConvertOptions } from "../src/lib/formats";

async function main() {
  const base = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 3,
      background: { r: 10, g: 20, b: 200 },
    },
  })
    .png()
    .toBuffer();

  const tiff = await sharp(base).tiff().toBuffer();
  const avif = await sharp(base).avif().toBuffer();

  const r1 = await convertSingleImage({
    buffer: tiff,
    originalName: "a.tiff",
    options: defaultConvertOptions("jpg"),
  });
  const r2 = await convertSingleImage({
    buffer: avif,
    originalName: "a.avif",
    options: defaultConvertOptions("png"),
  });
  const r3 = await convertSingleImage({
    buffer: base,
    originalName: "a.png",
    options: defaultConvertOptions("bmp"),
  });

  console.log("TIFF->JPG", r1.size, r1.mime);
  console.log("AVIF->PNG", r2.size, r2.mime);
  console.log("PNG->BMP", r3.size, r3.mime, r3.fileName);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
