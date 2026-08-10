import { NextResponse } from "next/server";
import { deleteRamal, updateRamal } from "@/lib/ramais-store";
import { requireSemitAdmin } from "@/lib/semit-auth";
import { logTechnical, toUserError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authStatus(error: unknown): number {
  const status = (error as { status?: number })?.status;
  return typeof status === "number" ? status : 500;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireSemitAdmin(request);
    const { id } = await context.params;
    const body = (await request.json()) as { ramal?: string; nomeSetor?: string };
    const item = await updateRamal(id, body);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const status = authStatus(error);
    if (status === 401 || status === 403 || status === 400 || status === 404) {
      return NextResponse.json(
        { ok: false, error: error instanceof Error ? error.message : "Erro" },
        { status },
      );
    }
    logTechnical("api.ramais.patch", error);
    const mapped = toUserError(error);
    return NextResponse.json(
      { ok: false, error: mapped.message, code: mapped.code },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireSemitAdmin(request);
    const { id } = await context.params;
    await deleteRamal(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = authStatus(error);
    if (status === 401 || status === 403 || status === 404) {
      return NextResponse.json(
        { ok: false, error: error instanceof Error ? error.message : "Erro" },
        { status },
      );
    }
    logTechnical("api.ramais.delete", error);
    const mapped = toUserError(error);
    return NextResponse.json(
      { ok: false, error: mapped.message, code: mapped.code },
      { status: 500 },
    );
  }
}
