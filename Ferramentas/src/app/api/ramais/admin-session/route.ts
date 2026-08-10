import { NextResponse } from "next/server";
import { requireSemitAdmin } from "@/lib/semit-auth";
import { logTechnical } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireSemitAdmin(request);
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    const status = (error as { status?: number })?.status;
    if (status === 401 || status === 403) {
      return NextResponse.json(
        { ok: false, error: error instanceof Error ? error.message : "Não autorizado" },
        { status },
      );
    }
    logTechnical("api.ramais.admin-session", error);
    return NextResponse.json(
      { ok: false, error: "Falha ao validar sessão admin." },
      { status: 500 },
    );
  }
}
