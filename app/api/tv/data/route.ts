import { NextResponse } from "next/server";
import { getTvData, isTvEnabled } from "@/lib/tv-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Datos públicos de la pantalla del local. Solo lectura; 404 si TV_ENABLED no es "true". */
export async function GET() {
  if (!isTvEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const data = await getTvData();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=30" },
    });
  } catch (error) {
    console.error("GET /api/tv/data error:", error);
    return NextResponse.json(
      { error: "Error al obtener datos" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
