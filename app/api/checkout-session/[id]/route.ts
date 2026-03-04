import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

    const cs = await prisma.checkoutSession.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        mpStatus: true,
        approvedAt: true,
        createdAt: true,
      },
    });

    if (!cs) return NextResponse.json({ error: "No existe" }, { status: 404 });

    // ✅ Endpoint público: solo estado / trazabilidad mínima
    return NextResponse.json(cs);
  } catch (e) {
    console.error("GET checkoutSession error:", e);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}