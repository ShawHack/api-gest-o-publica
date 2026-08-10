import { NextResponse } from "next/server";
import { zipResults } from "@/services/zip";
import { AppError, logTechnical, toUserError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { resultIds?: string[] };
    const resultIds = body.resultIds || [];
    const { buffer, fileName } = await zipResults(resultIds);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logTechnical("api.zip", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const mapped = toUserError(error);
    return NextResponse.json(
      { ok: false, error: mapped.message, code: mapped.code },
      { status: 422 },
    );
  }
}
