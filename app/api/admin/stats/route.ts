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

    const now = new Date();

    const [
      totalProducts,
      activeProducts,
      onSaleProducts,
      featuredProducts,
      totalOrders,
      pendingOrders,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({
        where: {
          isOnSale: true,
          OR: [{ saleEndDate: null }, { saleEndDate: { gt: now } }],
        },
      }),
      prisma.product.count({ where: { isFeatured: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
    ]);

    return NextResponse.json({
      totalProducts,
      activeProducts,
      onSaleProducts,
      featuredProducts,
      totalOrders,
      pendingOrders,
    });
  } catch (e) {
    console.error("GET /api/admin/stats error:", e);
    return NextResponse.json(
      { error: "Error cargando estadísticas" },
      { status: 500 }
    );
  }
}
