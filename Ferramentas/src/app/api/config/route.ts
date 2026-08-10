import { NextResponse } from "next/server";
import { DEFAULT_LIMITS } from "@/lib/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    limits: DEFAULT_LIMITS,
    notice:
      "Os arquivos são temporários e serão excluídos automaticamente após a conversão (retenção limitada).",
  });
}
