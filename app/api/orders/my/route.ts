import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { estimateReadyAt } from "@/lib/business-hours";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions).catch(() => null);

    const userId = (session?.user as any)?.id as string | undefined;
    const email = session?.user?.email ?? undefined;
    const phone = (session?.user as any)?.phone as string | undefined;

    if (!userId && !email && !phone) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // ✅ Tipamos correctamente el OR
    const OR: Prisma.OrderWhereInput[] = [];

    if (userId) OR.push({ userId });
    if (email) OR.push({ userId: null, email });
    if (phone) OR.push({ userId: null, phone });

    const orders = await prisma.order.findMany({
      where: { OR },
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: true } } },
    });

    // ✅ Tipo exacto del resultado de la query
    type OrderWithItems = Prisma.OrderGetPayload<{
      include: { items: { include: { product: true } } };
    }>;

    const enriched = (orders as OrderWithItems[]).map((o) => {
      const est = estimateReadyAt(o.createdAt, 2);

      return {
        ...o,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt ? o.updatedAt.toISOString() : undefined,
        estimatedReadyAt: est.readyAt.toISOString(),
        estimatedReadyNote: est.note,
      };
    });

    return NextResponse.json({
      orders: enriched,
      count: enriched.length,
    });
  } catch (e) {
    console.error("GET /api/orders/my error:", e);
    return NextResponse.json(
      { error: "Error cargando mis órdenes" },
      { status: 500 }
    );
  }
}