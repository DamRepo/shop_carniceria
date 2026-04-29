import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendTransferRejectedEmail } from "@/lib/mail/actions";
import { formatTransferAmount } from "@/lib/transfer-code";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function computeStockIncrement(unitType: "PER_UNIT" | "PER_KG", qty: number): number {
  if (unitType === "PER_UNIT") {
    return Math.round(qty);
  }
  return Math.round(qty * 1000);
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
    const rejectNote = typeof body?.reason === "string" && body.reason.trim()
      ? body.reason.trim()
      : "No se pudo verificar la transferencia.";

    const order = await (prisma.order.findUnique as any)({
      where: { id: orderId },
      select: {
        id: true,
        paymentMethod: true,
        transferStatus: true,
        transferCode: true,
        customerName: true,
        email: true,
        total: true,
        status: true,
        items: {
          select: {
            quantity: true,
            product: { select: { id: true, unitType: true } },
          },
        },
      },
    }) as any;

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (order.paymentMethod !== "BANK_TRANSFER") {
      return NextResponse.json({ error: "No es un pago por transferencia" }, { status: 400 });
    }

    // Atomic: updateMany with transferStatus guard prevents double stock restoration
    // on concurrent reject requests. Both reads happen outside the tx, but only one
    // UPDATE succeeds — the second sees count=0 and returns early.
    const processed = await prisma.$transaction(async (tx: any) => {
      const result = await tx.order.updateMany({
        where: {
          id: orderId,
          transferStatus: { notIn: ["REJECTED", "CONFIRMED"] },
        },
        data: {
          transferStatus: "REJECTED",
          transferRejectedAt: new Date(),
          transferRejectNote: rejectNote,
          paymentStatus: "FAILED",
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledBy: "ADMIN",
          cancellationReason: rejectNote,
        },
      });

      if (result.count === 0) return false;

      const incByProductId = new Map<string, number>();

      for (const it of order.items as any[]) {
        if (!it.product) continue;
        const productId = it.product.id as string;
        const unitType = it.product.unitType as "PER_KG" | "PER_UNIT";
        const inc = computeStockIncrement(unitType, Number(it.quantity ?? 0));
        if (inc <= 0) continue;
        incByProductId.set(productId, (incByProductId.get(productId) ?? 0) + inc);
      }

      for (const [productId, inc] of incByProductId.entries()) {
        await tx.product.update({
          where: { id: productId },
          data: { stock: { increment: inc } },
        });
      }

      return true;
    });

    if (!processed) {
      return NextResponse.json({ error: "Pago ya rechazado o confirmado" }, { status: 400 });
    }

    if (order.email && order.transferCode) {
      sendTransferRejectedEmail({
        to: order.email,
        customerName: order.customerName,
        transferCode: order.transferCode,
        totalText: formatTransferAmount(order.total),
        rejectNote,
      }).catch((e) => console.error("Email rechazo transferencia falló:", e));
    }

    const code = order.transferCode ?? order.id.slice(0, 8);
    const escHtmlTg = (v: string) =>
      v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    sendTelegramMessage({
      text:
        `<b>❌ Transferencia rechazada</b>\n` +
        `<b>Código:</b> <code>${escHtmlTg(code)}</code>\n` +
        `<b>Cliente:</b> ${escHtmlTg(order.customerName)}\n` +
        `<b>Monto:</b> ${escHtmlTg(formatTransferAmount(order.total))}\n` +
        `<b>Motivo:</b> ${escHtmlTg(rejectNote)}`,
    }).catch((e) => console.error("Telegram rechazo transferencia falló:", e));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH transfers/reject error:", e);
    return NextResponse.json({ error: "Error rechazando pago" }, { status: 500 });
  }
}
