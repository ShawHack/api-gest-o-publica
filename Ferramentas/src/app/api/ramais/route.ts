import { NextResponse } from "next/server";
import { createRamal, searchRamaisMongo } from "@/lib/ramais-store";
import { requireSemitAdmin } from "@/lib/semit-auth";
import { logTechnical, toUserError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authStatus(error: unknown): number {
  const status = (error as { status?: number })?.status;
  return typeof status === "number" ? status : 500;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ramal = searchParams.get("ramal") ?? "";
    const nomeSetor = searchParams.get("nome") ?? searchParams.get("nomeSetor") ?? "";
    const items = await searchRamaisMongo({ ramal, nomeSetor });

    return NextResponse.json({
      ok: true,
      total: items.length,
      items,
    });
  } catch (error) {
    logTechnical("api.ramais.get", error);
    const mapped = toUserError(error);
    return NextResponse.json(
      { ok: false, error: mapped.message, code: mapped.code },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireSemitAdmin(request);
    const body = (await request.json()) as { ramal?: string; nomeSetor?: string };
    const item = await createRamal({
      ramal: body.ramal ?? "",
      nomeSetor: body.nomeSetor ?? "",
    });
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    const status = authStatus(error);
    if (status === 401 || status === 403 || status === 400) {
      return NextResponse.json(
        { ok: false, error: error instanceof Error ? error.message : "Erro" },
        { status },
      );
    }
    logTechnical("api.ramais.post", error);
    const mapped = toUserError(error);
    return NextResponse.json(
      { ok: false, error: mapped.message, code: mapped.code },
      { status: 500 },
    );
  }
}
