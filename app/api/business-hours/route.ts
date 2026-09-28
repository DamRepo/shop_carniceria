import { NextResponse } from "next/server";
import { getStoreHours } from "@/lib/business-hours-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Horario del local (público). Siempre responde un horario válido: si la base falla, el fijo. */
export async function GET() {
  const hours = await getStoreHours();
  return NextResponse.json({ hours }, { headers: { "Cache-Control": "no-store" } });
}
