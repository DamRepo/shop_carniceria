import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { MpCheckoutState } from "@/app/(shop)/checkout/mp/MpPaymentStatusWatcher";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Estado público de un pago de Mercado Pago, consultado por csId (cuid no
 * adivinable) desde las pantallas de retorno de MP. Devuelve solo un estado
 * derivado: ni mpStatus crudo, ni ids de pago, ni montos, ni datos personales.
 */
export async function GET(_req: Request, { params }: { params: { csId: string } }) {
  const cs = await prisma.checkoutSession.findUnique({
    where: { id: params.csId },
    select: {
      order: { select: { orderNumber: true, status: true, paymentStatus: true, mpStatus: true } },
    },
  });

  const order = cs?.order;
  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  let state: MpCheckoutState;
  if (order.paymentStatus === "PAID") {
    state = "paid";
  } else if (order.status === "CANCELLED" && order.mpStatus?.startsWith("cancelled_order_paid:")) {
    // Pago aprobado que llegó sobre una orden ya cancelada: la plata entró aunque
    // la orden nunca pase a PAID (ver rama ORDER_CANCELLED de mp-payment-processor).
    state = "paid_on_cancelled";
  } else if (
    order.paymentStatus === "FAILED" ||
    order.paymentStatus === "CANCELLED" ||
    order.status === "CANCELLED"
  ) {
    state = "failed";
  } else {
    state = "pending";
  }

  return NextResponse.json({ state, orderNumber: order.orderNumber });
}
