import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { consultarPagoTalo } from "@/lib/talo";
import {
  finalizeTaloOrderAsPaid,
  findCheckoutSessionForOrder,
} from "@/lib/talo-payment-processor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isInReview(taloStatus: string | null): boolean {
  return taloStatus === "OVERPAID" || taloStatus === "UNDERPAID" || !!taloStatus?.startsWith("mismatch:");
}

/**
 * Confirmación manual de una orden Talo que quedó en revisión por
 * overpaid/underpaid/mismatch de monto. A diferencia del webhook, acá la
 * decisión de dar el pago por bueno es del admin (verificó el monto por
 * fuera, ej. homebanking o el propio dashboard de Talo) — no volvemos a
 * evaluar el monto, solo re-consultamos Talo por prolijidad/auditoría antes
 * de confirmar (no bloqueante si falla).
 */
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
        paymentMethod: true,
        paymentStatus: true,
        taloStatus: true,
        taloPaymentId: true,
        taloCvu: true,
        taloAlias: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (order.paymentMethod !== "TALO_PAY") {
      return NextResponse.json({ error: "No es un pago de Talo Pay" }, { status: 400 });
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json({ error: "Ya está pagada" }, { status: 400 });
    }

    if (!isInReview(order.taloStatus)) {
      return NextResponse.json(
        { error: "Esta orden no está en revisión manual" },
        { status: 400 }
      );
    }

    if (!order.taloPaymentId) {
      return NextResponse.json(
        { error: "La orden no tiene un pago de Talo asociado" },
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

    // Re-consulta best-effort: si Talo no responde, igual dejamos avanzar la
    // confirmación (la decide el admin), pero preferimos los datos más
    // frescos de CVU/alias cuando están disponibles.
    let taloCvu = order.taloCvu;
    let taloAlias = order.taloAlias;
    try {
      const pago = await consultarPagoTalo(order.taloPaymentId);
      if (pago.quotes?.[0]) {
        taloCvu = pago.quotes[0].cvu ?? pago.quotes[0].address ?? taloCvu;
        taloAlias = pago.quotes[0].alias ?? taloAlias;
      }
    } catch (err) {
      console.error("[admin/talo/confirm] Error re-consultando Talo (no bloqueante):", err, {
        orderId: order.id,
      });
    }

    try {
      const result = await finalizeTaloOrderAsPaid({
        orderId: order.id,
        cs,
        taloPaymentId: order.taloPaymentId,
        taloStatusToStore: `admin_confirmed:${order.taloStatus}`,
        taloCvu,
        taloAlias,
      });

      return NextResponse.json({ ok: true, orderId: result.orderId, orderNumber: result.orderNumber });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);

      if (msg === "ALREADY_PROCESSED") {
        return NextResponse.json({ error: "Ya está pagada" }, { status: 400 });
      }

      console.error("[admin/talo/confirm] Error confirmando orden:", e, { orderId: order.id });
      return NextResponse.json({ error: "Error confirmando el pago" }, { status: 500 });
    }
  } catch (e) {
    console.error("PATCH /api/admin/talo/[id]/confirm error:", e);
    return NextResponse.json({ error: "Error confirmando el pago" }, { status: 500 });
  }
}
