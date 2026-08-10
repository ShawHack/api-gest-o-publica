import { NextResponse } from "next/server";
import fs from "fs/promises";
import { getResult } from "@/services/storage";
import { UserMessages } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const item = getResult(id);
  if (!item) {
    return NextResponse.json(
      { ok: false, error: UserMessages.notFound, code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const data = await fs.readFile(item.filePath);
  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": item.mime,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(item.fileName)}"`,
      "Content-Length": String(data.byteLength),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
