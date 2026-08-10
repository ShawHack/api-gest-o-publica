import convert from "heic-convert";
import { AppError, UserMessages, logTechnical } from "@/lib/errors";

/**
 * Decode HEIC/HEIF to PNG buffer using libheif-js via heic-convert.
 * Always run on the server — browser support is unreliable.
 */
export async function decodeHeicToPng(input: Buffer): Promise<Buffer> {
  try {
    const output = await convert({
      buffer: input,
      format: "PNG",
      quality: 1,
    });
    return Buffer.from(output);
  } catch (error) {
    logTechnical("heic.decode", error);
    throw new AppError(UserMessages.heicFailed, "HEIC_DECODE", 422);
  }
}
