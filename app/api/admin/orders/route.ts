import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const role = (session?.user as any)?.role as string | undefined;

    if (!session?.user || !role) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: true } },
      },
    });

    // ✅ IMPORTANTE: devolver ARRAY directo
    return NextResponse.json(orders);
  } catch (e) {
    console.error("GET /api/admin/orders error:", e);
    return NextResponse.json(
      { error: "Error cargando órdenes" },
      { status: 500 }
    );
  }
}