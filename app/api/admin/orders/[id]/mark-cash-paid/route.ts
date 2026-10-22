import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney, sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const orderSelect = {
  orderNumber: true,
  customerName: true,
  total: true,
  paymentMethod: true,
  paymentStatus: true,
  status: true,
} as const;

const escHtmlTg = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Orden cancelada: no se pasa a PAID. Se avisa por Telegram porque, si el
// cliente efectivamente pagó, hay que devolver la plata o rehacer el pedido
// (el stock de la orden cancelada ya se devolvió).
function cancelledOrderResponse(
  orderId: string,
  order: { orderNumber: string; customerName: string; total: number }
) {
  console.error("mark-cash-paid: intento de cobro sobre orden CANCELADA", { orderId });

  sendTelegramMessage({
    text:
      `<b>⚠️ Intento de cobro en efectivo sobre orden cancelada #${escHtmlTg(order.orderNumber)}</b>\n` +
      `<b>Cliente:</b> ${escHtmlTg(order.customerName)}\n` +
      `<b>Monto:</b> ${formatMoney(order.total)}\n` +
      `No se marcó como cobrada. Si se recibió el dinero, requiere devolución manual.`,
  }).catch((e) => console.error("Telegram cobro en orden cancelada falló:", e));

  return NextResponse.json(
    {
      error:
        "La orden está cancelada y no se puede marcar como cobrada. Si el cliente pagó, hay que devolver el dinero o rehacer el pedido.",
      cancelled: true,
    },
    { status: 409 }
  );
}

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

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: orderSelect,
    });

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
      return NextResponse.json({ ok: true, alreadyPaid: true, message: "Esta orden ya estaba cobrada." });
    }

    if (order.status === "CANCELLED") {
      return cancelledOrderResponse(params.id, order);
    }

    // Guarda atómica (mismo patrón que MP/Talo): el WHERE se re-evalúa bajo el
    // lock de fila, así que dos clics concurrentes o una cancelación en el medio
    // no pueden dejar la orden cobrada dos veces ni cobrar una cancelada.
    // PENDING_PAYMENT pasa a CONFIRMED; cualquier otro estado conserva el suyo.
    const now = new Date();
    let { count } = await prisma.order.updateMany({
      where: {
        id: params.id,
        paymentMethod: "CASH",
        paymentStatus: { not: "PAID" },
        status: "PENDING_PAYMENT",
      },
      data: { paymentStatus: "PAID", paidAt: now, status: "CONFIRMED", confirmedAt: now },
    });

    if (count === 0) {
      ({ count } = await prisma.order.updateMany({
        where: {
          id: params.id,
          paymentMethod: "CASH",
          paymentStatus: { not: "PAID" },
          status: { notIn: ["CANCELLED", "PENDING_PAYMENT"] },
        },
        data: { paymentStatus: "PAID", paidAt: now },
      }));
    }

    if (count === 0) {
      // Otro request ganó la carrera: ya está cobrada o la cancelaron recién.
      const latest = await prisma.order.findUnique({
        where: { id: params.id },
        select: orderSelect,
      });
      if (!latest) {
        return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
      }
      if (latest.status === "CANCELLED" && latest.paymentStatus !== "PAID") {
        return cancelledOrderResponse(params.id, latest);
      }
      return NextResponse.json({ ok: true, alreadyPaid: true, message: "Esta orden ya estaba cobrada." });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST mark-cash-paid error:", e);
    return NextResponse.json({ error: "Error al marcar como cobrado" }, { status: 500 });
  }
}
