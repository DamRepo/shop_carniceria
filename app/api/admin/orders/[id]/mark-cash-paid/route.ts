import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const role = (session?.user as any)?.role as string | undefined;

    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const order = await (prisma.order.findUnique as any)({
      where: { id: params.id },
      select: {
        paymentMethod: true,
        paymentStatus: true,
        status: true,
      },
    }) as { paymentMethod: string; paymentStatus: string; status: string } | null;

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (order.paymentMethod !== "CASH") {
      return NextResponse.json(
        { error: "Esta orden no es pago en efectivo" },
        { status: 400 }
      );
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json({ ok: true, alreadyPaid: true });
    }

    await (prisma.order.update as any)({
      where: { id: params.id },
      data: {
        paymentStatus: "PAID",
        paidAt: new Date(),
        status: order.status === "PENDING_PAYMENT" ? "CONFIRMED" : order.status,
        confirmedAt: order.status === "PENDING_PAYMENT" ? new Date() : undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST mark-cash-paid error:", e);
    return NextResponse.json({ error: "Error al marcar como cobrado" }, { status: 500 });
  }
}
