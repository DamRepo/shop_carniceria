import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { estimateReadyAt } from "@/lib/business-hours";

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

    const OR: { userId?: string | null; email?: string; phone?: string }[] = [];

    if (userId) OR.push({ userId });
    if (email) OR.push({ userId: null, email });
    if (phone) OR.push({ userId: null, phone });

    const orders = await prisma.order.findMany({
      where: { OR },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50, // historial reciente — evita traer toda la vida del usuario
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        deliveryMethod: true,
        subtotal: true,
        deliveryCost: true,
        total: true,
        createdAt: true,
        updatedAt: true,
        confirmedAt: true,
        paidAt: true,
        pickupDate: true,
        pickupTimeSlot: true,
        pickupNotes: true,
        cancelledAt: true,
        address: true,
        city: true,
        notes: true,
        customerName: true,
        phone: true,
        email: true,
        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            createdAt: true,
            product: {
              select: { id: true, name: true, slug: true, image: true, unitType: true },
            },
          },
        },
      },
    });

    type OrderWithItems = typeof orders[number];

    const enriched = (orders as OrderWithItems[]).map((o) => {
      const est = estimateReadyAt(o.createdAt, 2);

      return {
        ...o,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt ? o.updatedAt.toISOString() : null,
        confirmedAt: o.confirmedAt ? o.confirmedAt.toISOString() : null,
        paidAt: o.paidAt ? o.paidAt.toISOString() : null,

        pickupDate: o.pickupDate ? o.pickupDate.toISOString() : null,
        pickupTimeSlot: o.pickupTimeSlot ?? null,
        pickupNotes: o.pickupNotes ?? null,

        cancelledAt: o.cancelledAt ? o.cancelledAt.toISOString() : null,

        estimatedReadyAt: est.readyAt.toISOString(),
        estimatedReadyNote: est.note,

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items: (o.items ?? []).map((item: any) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
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