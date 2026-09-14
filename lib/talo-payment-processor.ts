import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { consultarPagoTalo, extraerCvuAlias, type TaloPago } from "@/lib/talo";
import { sendTelegramMessage, buildTelegramOrderMessage } from "@/lib/telegram";

/**
 * Procesa la confirmación real de un pago de Talo. Es la ÚNICA función que
 * escribe en Order/CheckoutSession a partir de un pago de Talo — la usan
 * tanto el webhook (app/api/webhooks/talo/route.ts) como el cron de
 * reconciliación (scripts/reconcile-talo-payments.ts), para no duplicar
 * la lógica de confirmación/expiración/idempotencia en dos lugares.
 *
 * Nunca confía en quien la llama: siempre vuelve a consultar el pago en
 * Talo con Bearer antes de tocar la orden.
 *
 * Sin import "server-only" a propósito: lib/talo.ts explica por qué (lo
 * necesita también el script de reconciliación, corrido fuera de Next.js).
 */

type SnapshotItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type TaloProcessResult =
  | { outcome: "confirmed"; orderId: string; orderNumber: string }
  | { outcome: "expired"; orderId: string }
  | { outcome: "overpaid" | "underpaid"; orderId: string }
  | { outcome: "mismatch"; orderId: string; paidAmount: number; expectedAmount: number }
  | { outcome: "pending"; orderId: string; taloStatus: string }
  | { outcome: "already_processed"; orderId: string }
  | { outcome: "order_not_found"; paymentId: string }
  | { outcome: "checkout_session_not_found"; orderId: string }
  | { outcome: "snapshot_invalid"; orderId: string }
  | { outcome: "error"; message: string };

function getReserveQty(qty: number, unitType: "PER_UNIT" | "PER_KG") {
  if (unitType === "PER_UNIT") {
    const units = Math.round(Number(qty ?? 0));
    if (units <= 0) {
      throw new Error("Cantidad inválida en unidades");
    }
    return units;
  }

  const grams = Math.round(Number(qty ?? 0) * 1000);
  if (grams <= 0) {
    throw new Error("Cantidad inválida en gramos");
  }
  return grams;
}

function safeNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export async function releaseReservation(
  tx: Prisma.TransactionClient,
  cs: { id: string; reservationReleased: boolean | null; itemsSnapshot: unknown }
) {
  // Guard atómico: solo una instancia concurrente logra liberar (mismo patrón que el webhook de MP).
  const guard = await tx.checkoutSession.updateMany({
    where: { id: cs.id, reservationReleased: false },
    data: { reservationReleased: true },
  });

  if (guard.count === 0) return;

  const items = cs.itemsSnapshot as SnapshotItem[];
  if (!Array.isArray(items) || items.length === 0) {
    console.warn("[talo] releaseReservation: itemsSnapshot vacío", { checkoutSessionId: cs.id });
    return;
  }

  for (const it of items) {
    const product = await tx.product.findUnique({
      where: { id: it.productId },
      select: { unitType: true },
    });

    if (!product) continue;

    const reserveQty = getReserveQty(it.quantity, product.unitType);

    await tx.product.updateMany({
      where: { id: it.productId, reservedStock: { gte: reserveQty } },
      data: { reservedStock: { decrement: reserveQty } },
    });
  }
}

export async function findCheckoutSessionForOrder(orderId: string) {
  return prisma.checkoutSession.findFirst({
    where: { orderId },
    orderBy: { id: "desc" },
    select: {
      id: true,
      itemsSnapshot: true,
      reservationReleased: true,
      taloPaymentId: true,
      taloStatus: true,
      status: true,
    },
  });
}

async function findOrderForPago(pago: TaloPago) {
  const byPaymentId = await prisma.order.findUnique({
    where: { taloPaymentId: pago.id },
    select: { id: true, total: true, paymentStatus: true, taloPaymentId: true, orderNumber: true },
  });

  if (byPaymentId) return byPaymentId;

  if (pago.external_id) {
    return prisma.order.findUnique({
      where: { id: pago.external_id },
      select: { id: true, total: true, paymentStatus: true, taloPaymentId: true, orderNumber: true },
    });
  }

  return null;
}

/**
 * Confirma definitivamente una orden de Talo como pagada: guard atómico +
 * descuento de stock reservado + `CheckoutSession.APPROVED` + Telegram.
 *
 * Extraída del camino feliz de `processTaloPayment` (status SUCCESS) para que
 * la reutilice también la confirmación manual del admin
 * (`app/api/admin/talo/[id]/confirm/route.ts`) cuando un pago quedó en
 * revisión por overpaid/underpaid/mismatch y el admin decide darlo por bueno
 * de todas formas — la decisión de confirmar en ese caso es del admin, no de
 * Talo, así que esta función no vuelve a evaluar el monto: solo ejecuta la
 * confirmación tal como ya lo hace el camino feliz.
 *
 * Tira `Error` con un mensaje sentinel ("ALREADY_PROCESSED", "SNAPSHOT_INVALID",
 * "PRODUCT_NOT_FOUND:<id>", "RESERVE_CONFIRM_FAILED:<id>:<qty>") ante cualquier
 * falla — cada caller decide cómo mapearlo a su propia respuesta.
 */
export async function finalizeTaloOrderAsPaid(params: {
  orderId: string;
  cs: { id: string; itemsSnapshot: unknown };
  taloPaymentId: string;
  taloStatusToStore: string;
  taloCvu?: string | null;
  taloAlias?: string | null;
}): Promise<{ orderId: string; orderNumber: string }> {
  const { orderId, cs, taloPaymentId, taloStatusToStore, taloCvu, taloAlias } = params;

  const items = cs.itemsSnapshot as SnapshotItem[];
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("SNAPSHOT_INVALID");
  }

  await prisma.$transaction(async (tx) => {
    // Guard atómico contra reprocesamiento por llamadas duplicadas o concurrentes
    // (webhook + cron, dos webhooks, confirmación manual del admin, etc.): el
    // UPDATE toma el lock de fila y Postgres re-evalúa el WHERE bajo ese lock,
    // así que solo UNA llamada concurrente puede obtener count=1. Las demás ven
    // count=0 y abortan antes de tocar stock — no hace falta un SELECT previo.
    const orderUpdate = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: { not: "PAID" } },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        paymentMethod: "TALO_PAY",
        paymentStatus: "PAID",
        paidAt: new Date(),
        taloPaymentId,
        taloStatus: taloStatusToStore,
        taloCvu: taloCvu ?? undefined,
        taloAlias: taloAlias ?? undefined,
      },
    });

    if (orderUpdate.count === 0) {
      throw new Error("ALREADY_PROCESSED");
    }

    for (const it of items) {
      const product = await tx.product.findUnique({
        where: { id: it.productId },
        select: { unitType: true },
      });

      if (!product) {
        throw new Error(`PRODUCT_NOT_FOUND:${it.productId}`);
      }

      const dec = getReserveQty(it.quantity, product.unitType);

      const updated = await tx.product.updateMany({
        where: { id: it.productId, reservedStock: { gte: dec } },
        data: { stock: { decrement: dec }, reservedStock: { decrement: dec } },
      });

      if (updated.count === 0) {
        throw new Error(`RESERVE_CONFIRM_FAILED:${it.productId}:${dec}`);
      }
    }

    await tx.checkoutSession.update({
      where: { id: cs.id },
      data: {
        status: "APPROVED",
        taloStatus: taloStatusToStore,
        approvedAt: new Date(),
        reservationReleased: true,
      },
    });
  });

  console.log("[talo] Pago confirmado", { orderId, taloPaymentId });

  const fullOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      orderNumber: true,
      customerName: true,
      phone: true,
      email: true,
      deliveryMethod: true,
      address: true,
      pickupDate: true,
      pickupTimeSlot: true,
      subtotal: true,
      deliveryCost: true,
      total: true,
      items: {
        select: {
          quantity: true,
          lineTotal: true,
          product: { select: { name: true, unitType: true } },
        },
      },
    },
  });

  if (fullOrder) {
    sendTelegramMessage({
      text: buildTelegramOrderMessage({
        orderNumber: fullOrder.orderNumber,
        customerName: fullOrder.customerName ?? "",
        phone: fullOrder.phone ?? "",
        email: fullOrder.email,
        deliveryMethod: fullOrder.deliveryMethod as "PICKUP" | "DELIVERY",
        paymentMethod: "TALO_PAY",
        address: fullOrder.address,
        pickupDate: fullOrder.pickupDate,
        pickupTimeSlot: fullOrder.pickupTimeSlot,
        subtotalCents: Number(fullOrder.subtotal),
        deliveryCostCents: Number(fullOrder.deliveryCost ?? 0),
        totalCents: Number(fullOrder.total),
        items: fullOrder.items.map((it) => ({
          name: it.product?.name ?? "",
          quantity: Number(it.quantity),
          unitType: (it.product?.unitType ?? "PER_UNIT") as "PER_KG" | "PER_UNIT",
          lineTotalCents: Number(it.lineTotal),
        })),
      }),
    }).catch((e) => console.error("[talo] Telegram error:", e));
  }

  return { orderId, orderNumber: fullOrder?.orderNumber ?? orderId };
}

export async function processTaloPayment(paymentId: string): Promise<TaloProcessResult> {
  console.log("[talo] processTaloPayment:start", { paymentId });

  let pago: TaloPago;
  try {
    pago = await consultarPagoTalo(paymentId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[talo] Error consultando pago en Talo:", err, { paymentId });
    return { outcome: "error", message };
  }

  const order = await findOrderForPago(pago);
  if (!order) {
    console.error("[talo] Orden no encontrada para el pago", {
      paymentId,
      externalId: pago.external_id,
    });
    return { outcome: "order_not_found", paymentId };
  }

  if (order.paymentStatus === "PAID") {
    // Chequeo optimista de salida temprana (evita consultas/efectos redundantes).
    // NO es la guarda de concurrencia real: esa es el updateMany atómico de más abajo.
    console.log("[talo] Orden ya estaba PAID, se ignora (idempotencia)", {
      paymentId,
      orderId: order.id,
    });
    return { outcome: "already_processed", orderId: order.id };
  }

  const cs = await findCheckoutSessionForOrder(order.id);
  if (!cs) {
    console.error("[talo] CheckoutSession no encontrada para la orden", {
      paymentId,
      orderId: order.id,
    });
    return { outcome: "checkout_session_not_found", orderId: order.id };
  }

  const { cvu, alias } = extraerCvuAlias(pago);
  const status = pago.payment_status;

  if (status === "SUCCESS") {
    // Sanity check adicional: el monto acreditado (pesos) debe coincidir con el
    // total de la orden en DB (centavos / 100 = pesos).
    const paidAmount = safeNumber(pago.price?.amount);
    const expectedAmount = safeNumber(order.total) / 100;
    const tolerance = Math.max(0.01, expectedAmount * 0.001);
    const amountMismatch =
      Number.isFinite(paidAmount) &&
      Number.isFinite(expectedAmount) &&
      Math.abs(paidAmount - expectedAmount) > tolerance;

    if (amountMismatch) {
      console.error("[talo] Monto acreditado no coincide con el total esperado", {
        paymentId,
        orderId: order.id,
        paidAmount,
        expectedAmount,
      });

      await prisma
        .$transaction(async (tx) => {
          await tx.checkoutSession.update({
            where: { id: cs.id },
            data: { status: "FAILED", taloStatus: `mismatch:${status}` },
          });
          await tx.order.update({
            where: { id: order.id },
            data: { paymentStatus: "FAILED", taloStatus: `mismatch:${status}` },
          });
        })
        .catch((err) => console.error("[talo] tx error en mismatch:", err));

      return { outcome: "mismatch", orderId: order.id, paidAmount, expectedAmount };
    }

    try {
      const confirmed = await finalizeTaloOrderAsPaid({
        orderId: order.id,
        cs,
        taloPaymentId: pago.id,
        taloStatusToStore: status,
        taloCvu: cvu,
        taloAlias: alias,
      });

      return { outcome: "confirmed", orderId: confirmed.orderId, orderNumber: confirmed.orderNumber };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);

      if (msg === "ALREADY_PROCESSED") {
        console.log("[talo] Reprocesamiento ignorado (orden ya procesada)", {
          paymentId,
          orderId: order.id,
        });
        return { outcome: "already_processed", orderId: order.id };
      }

      if (msg === "SNAPSHOT_INVALID") {
        console.error("[talo] itemsSnapshot inválido en CheckoutSession", {
          checkoutSessionId: cs.id,
          orderId: order.id,
        });
        return { outcome: "snapshot_invalid", orderId: order.id };
      }

      console.error("[talo] Error confirmando orden:", e, { paymentId, orderId: order.id });
      return { outcome: "error", message: msg };
    }
  }

  if (status === "OVERPAID" || status === "UNDERPAID") {
    // Queda para revisión manual del admin: no se marca como pagada automáticamente.
    await prisma
      .$transaction(async (tx) => {
        await tx.checkoutSession.update({
          where: { id: cs.id },
          data: { status: "PENDING", taloStatus: status },
        });
        await tx.order.update({
          where: { id: order.id },
          data: { taloStatus: status, taloCvu: cvu ?? undefined, taloAlias: alias ?? undefined },
        });
      })
      .catch((err) => console.error("[talo] tx error en over/underpaid:", err));

    console.warn("[talo] Pago requiere revisión manual", { paymentId, orderId: order.id, status });
    return { outcome: status === "OVERPAID" ? "overpaid" : "underpaid", orderId: order.id };
  }

  if (status === "EXPIRED") {
    await prisma
      .$transaction(async (tx) => {
        await releaseReservation(tx, cs);

        await tx.checkoutSession.update({
          where: { id: cs.id },
          data: { status: "EXPIRED", taloStatus: status },
        });

        await tx.order.update({
          where: { id: order.id },
          data: { paymentStatus: "FAILED", status: "CANCELLED", taloStatus: status },
        });
      })
      .catch((err) => console.error("[talo] tx error en expired:", err));

    console.log("[talo] Pago expirado, reserva liberada", { paymentId, orderId: order.id });
    return { outcome: "expired", orderId: order.id };
  }

  // PENDING u otro estado intermedio: solo se actualiza el tracking.
  await prisma
    .$transaction([
      prisma.checkoutSession.update({
        where: { id: cs.id },
        data: { taloStatus: status },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { taloStatus: status },
      }),
    ])
    .catch((err) => console.error("[talo] tx error en pending:", err));

  console.log("[talo] Estado pendiente", { paymentId, orderId: order.id, status });
  return { outcome: "pending", orderId: order.id, taloStatus: status };
}
