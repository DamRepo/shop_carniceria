import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { formatTransferAmount } from "@/lib/transfer-code";
import { sendTelegramMessage } from "@/lib/telegram";
import {
  releaseReservation,
  findCheckoutSessionForOrder,
} from "@/lib/talo-payment-processor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isInReview(taloStatus: string | null): boolean {
  return taloStatus === "OVERPAID" || taloStatus === "UNDERPAID" || !!taloStatus?.startsWith("mismatch:");
}

function escHtmlTg(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const role = (session?.user as any)?.role as string | undefined;

    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const orderId = params.id;

    const body = await req.json().catch(() => ({}));
    const rejectReason =
      typeof body?.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : "El monto acreditado no coincide con el total de la orden.";

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        paymentMethod: true,
        paymentStatus: true,
        taloStatus: true,
        customerName: true,
        total: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (order.paymentMethod !== "TALO_PAY") {
      return NextResponse.json({ error: "No es un pago de Talo Pay" }, { status: 400 });
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json({ error: "Ya está pagada, no se puede rechazar" }, { status: 400 });
    }

    if (!isInReview(order.taloStatus)) {
      return NextResponse.json(
        { error: "Esta orden no está en revisión manual" },
        { status: 400 }
      );
    }

    const cs = await findCheckoutSessionForOrder(order.id);
    if (!cs) {
      return NextResponse.json(
        { error: "No se encontró la sesión de checkout de la orden" },
        { status: 404 }
      );
    }

    const processed = await prisma.$transaction(async (tx) => {
      // Mismo guard atómico que el resto del flujo de Talo: solo una llamada
      // concurrente gana la carrera (ver lib/talo-payment-processor.ts).
      const result = await tx.order.updateMany({
        where: { id: order.id, paymentStatus: { not: "PAID" } },
        data: {
          paymentStatus: "FAILED",
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledBy: "ADMIN",
          cancellationReason: rejectReason,
          taloStatus: `admin_rejected:${order.taloStatus}`,
        },
      });

      if (result.count === 0) return false;

      await releaseReservation(tx, cs);

      await tx.checkoutSession.update({
        where: { id: cs.id },
        data: { status: "FAILED", taloStatus: `admin_rejected:${order.taloStatus}` },
      });

      return true;
    });

    if (!processed) {
      return NextResponse.json({ error: "Ya está pagada o rechazada" }, { status: 400 });
    }

    sendTelegramMessage({
      text:
        `<b>❌ Pago Talo rechazado</b>\n` +
        `<b>Pedido:</b> <code>${escHtmlTg(order.orderNumber)}</code>\n` +
        `<b>Cliente:</b> ${escHtmlTg(order.customerName)}\n` +
        `<b>Monto:</b> ${escHtmlTg(formatTransferAmount(order.total))}\n` +
        `<b>Motivo:</b> ${escHtmlTg(rejectReason)}`,
    }).catch((e) => console.error("[admin/talo/reject] Telegram error:", e));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/admin/talo/[id]/reject error:", e);
    return NextResponse.json({ error: "Error rechazando el pago" }, { status: 500 });
  }
}
