import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendTransferConfirmedEmail } from "@/lib/mail/actions";
import { formatTransferAmount } from "@/lib/transfer-code";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const escHtmlTg = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const role = (session?.user as any)?.role as string | undefined;

    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const orderId = params.id;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        transferStatus: true,
        transferCode: true,
        customerName: true,
        email: true,
        total: true,
        deliveryMethod: true,
        pickupDate: true,
        pickupTimeSlot: true,
        address: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (order.paymentMethod !== "BANK_TRANSFER") {
      return NextResponse.json({ error: "No es un pago por transferencia" }, { status: 400 });
    }

    const now = new Date();

    // Guarda atómica (mismo patrón que MP/Talo): solo una request concurrente
    // obtiene count=1 (evita doble email), y nunca se cobra una orden cancelada
    // (p. ej. una transferencia ya rechazada, cuyo stock ya se devolvió).
    const result = await prisma.order.updateMany({
      where: {
        id: orderId,
        paymentMethod: "BANK_TRANSFER",
        transferStatus: { not: "CONFIRMED" },
        paymentStatus: { not: "PAID" },
        status: { not: "CANCELLED" },
      },
      data: {
        transferStatus: "CONFIRMED",
        transferConfirmedAt: now,
        paymentStatus: "PAID",
        paidAt: now,
        status: "CONFIRMED",
        confirmedAt: now,
      },
    });

    if (result.count === 0) {
      const latest = await prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true, paymentStatus: true },
      });

      if (latest?.status === "CANCELLED" && latest.paymentStatus !== "PAID") {
        // Si la plata efectivamente entró, hay que devolverla o rehacer el pedido
        // (el stock de la orden cancelada ya se devolvió).
        console.error("transfers/confirm: intento de confirmar orden CANCELADA", { orderId });
        const code = order.transferCode ?? order.orderNumber;
        sendTelegramMessage({
          text:
            `<b>⚠️ Intento de confirmar transferencia en orden cancelada #${escHtmlTg(order.orderNumber)}</b>\n` +
            `<b>Código:</b> <code>${escHtmlTg(code)}</code>\n` +
            `<b>Cliente:</b> ${escHtmlTg(order.customerName)}\n` +
            `<b>Monto:</b> ${escHtmlTg(formatTransferAmount(order.total))}\n` +
            `No se confirmó. Si se recibió la transferencia, requiere devolución manual.`,
        }).catch((e) => console.error("Telegram confirmación en orden cancelada falló:", e));

        return NextResponse.json(
          {
            error:
              "La orden está cancelada y no se puede confirmar el pago. Si la transferencia llegó, hay que devolver el dinero o rehacer el pedido.",
            cancelled: true,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Esta transferencia ya estaba confirmada.", alreadyPaid: true },
        { status: 409 }
      );
    }

    if (order.email && order.transferCode) {
      sendTransferConfirmedEmail({
        to: order.email,
        customerName: order.customerName,
        transferCode: order.transferCode,
        totalText: formatTransferAmount(order.total),
        deliveryMethod: order.deliveryMethod as "PICKUP" | "DELIVERY",
        pickupDate: order.pickupDate
          ? new Intl.DateTimeFormat("es-AR", {
              timeZone: "America/Argentina/Buenos_Aires",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })
              .format(order.pickupDate)
              .split("/")
              .reverse()
              .join("-")
          : null,
        pickupTimeSlot: order.pickupTimeSlot,
        address: order.address,
      }).catch((e) => console.error("Email confirm transferencia falló:", e));
    }

    const code = order.transferCode ?? order.id.slice(0, 8);
    sendTelegramMessage({
      text:
        `<b>✅ Transferencia confirmada</b>\n` +
        `<b>Código:</b> <code>${escHtmlTg(code)}</code>\n` +
        `<b>Cliente:</b> ${escHtmlTg(order.customerName)}\n` +
        `<b>Monto:</b> ${escHtmlTg(formatTransferAmount(order.total))}`,
    }).catch((e) => console.error("Telegram confirmación transferencia falló:", e));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH transfers/confirm error:", e);
    return NextResponse.json({ error: "Error confirmando pago" }, { status: 500 });
  }
}
