import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { sendTelegramMessage, buildTelegramOrderMessage, formatMoney } from "@/lib/telegram";

/**
 * Procesamiento de pagos de Mercado Pago. Es la ÚNICA lógica que escribe en
 * Order/CheckoutSession a partir de un pago de MP — la usan tanto el webhook
 * (app/api/mercadopago/webhook/route.ts) como la verificación manual
 * (admin y página de éxito), para no duplicar el guard atómico de confirmación.
 */

export type MpPayment = {
  id?: string | number;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: unknown;
  currency_id?: unknown;
  collector_id?: unknown;
  date_created?: string;
};

type SnapshotItem = {
  productId?: string | null;
  comboId?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

function getComboReserveQty(qty: number) {
  const units = Math.round(Number(qty ?? 0));
  if (units <= 0) {
    throw new Error("Cantidad inválida de combo");
  }
  return units;
}

export async function fetchMpPayment(paymentId: string, accessToken: string): Promise<MpPayment | null> {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("MP payment fetch error:", {
      paymentId,
      status: res.status,
      detail,
    });
    return null;
  }

  return res.json();
}

function safeNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : NaN;
}

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

async function releaseReservation(
  tx: Prisma.TransactionClient,
  cs: {
    id: string;
    orderId: string | null;
    reservationReleased: boolean | null;
    itemsSnapshot: unknown;
  }
) {
  // Guard atómico: marcar como liberada PRIMERO con condición reservationReleased=false.
  // Si dos instancias concurrentes llegan aquí, solo una obtendrá count=1;
  // la otra verá count=0 y sale sin tocar stock, evitando doble liberación.
  const guard = await tx.checkoutSession.updateMany({
    where: { id: cs.id, reservationReleased: false },
    data: { reservationReleased: true },
  });

  if (guard.count === 0) {
    // Ya fue liberada (o marcada por otra instancia concurrente)
    return;
  }

  // Órdenes que el admin canceló antes de que la cancelación marcara
  // reservationReleased: el stock ya se devolvió al cancelar, no liberar de nuevo.
  if (cs.orderId) {
    const current = await tx.order.findUnique({
      where: { id: cs.orderId },
      select: { status: true },
    });

    if (current?.status === "CANCELLED") {
      console.warn("releaseReservation: orden ya CANCELLED, no se libera stock de nuevo", {
        checkoutSessionId: cs.id,
        orderId: cs.orderId,
      });
      return;
    }
  }

  const items = cs.itemsSnapshot as SnapshotItem[];

  if (!Array.isArray(items) || items.length === 0) {
    console.warn("releaseReservation: itemsSnapshot vacío o inválido", {
      checkoutSessionId: cs.id,
    });
    return;
  }

  for (const it of items) {
    if (it.comboId) {
      const comboQty = getComboReserveQty(it.quantity);
      await tx.combo.updateMany({
        where: { id: it.comboId, reservedStock: { gte: comboQty } },
        data: { reservedStock: { decrement: comboQty } },
      });
      continue;
    }

    if (!it.productId) {
      console.warn("releaseReservation: ítem sin productId ni comboId", {
        checkoutSessionId: cs.id,
      });
      continue;
    }

    const product = await tx.product.findUnique({
      where: { id: it.productId },
      select: { unitType: true },
    });

    if (!product) {
      console.warn("releaseReservation: producto no encontrado", {
        checkoutSessionId: cs.id,
        productId: it.productId,
      });
      continue;
    }

    const reserveQty = getReserveQty(it.quantity, product.unitType);

    await tx.product.updateMany({
      where: {
        id: it.productId,
        reservedStock: { gte: reserveQty },
      },
      data: {
        reservedStock: { decrement: reserveQty },
      },
    });
  }
}

async function findCheckoutSessionForOrder(orderId: string) {
  return prisma.checkoutSession.findFirst({
    where: { orderId },
    orderBy: { id: "desc" },
    select: {
      id: true,
      orderId: true,
      itemsSnapshot: true,
      reservationReleased: true,
      expiresAt: true,
      mpPaymentId: true,
      mpStatus: true,
      status: true,
    },
  });
}

export async function processMpPayment(paymentId: string, payment: MpPayment) {
  const status: string | undefined = payment?.status;
  const externalReference: string | undefined = payment?.external_reference;
  const statusDetail: string | undefined = payment?.status_detail;

  console.log("MP processPayment:fetched", {
    paymentId,
    status,
    statusDetail,
    externalReference,
  });

  if (!externalReference) {
    console.error("MP payment sin external_reference", { paymentId });
    return { ok: true, ignored: "missing_external_reference" };
  }

  const order = await prisma.order.findUnique({
    where: { id: externalReference },
    select: {
      id: true,
      total: true,
      paymentStatus: true,
      mpPaymentId: true,
      mpStatus: true,
      status: true,
    },
  });

  if (!order) {
    console.error("Order no encontrada para external_reference", {
      paymentId,
      externalReference,
    });
    return { ok: true, ignored: "order_not_found" };
  }

  const cs = await findCheckoutSessionForOrder(order.id);

  if (!cs) {
    console.error("CheckoutSession no encontrada para la order", {
      paymentId,
      orderId: order.id,
    });
    return { ok: true, ignored: "checkout_session_not_found" };
  }

  if (order.paymentStatus === "PAID") {
    console.log("MP processPayment: ya procesado como PAID", {
      paymentId,
      orderId: order.id,
      existingMpPaymentId: order.mpPaymentId,
    });
    return { ok: true, alreadyProcessed: true };
  }

  if (order.mpPaymentId && order.mpPaymentId !== String(paymentId)) {
    console.warn("MP webhook con paymentId distinto para la misma order", {
      orderId: order.id,
      existingMpPaymentId: order.mpPaymentId,
      incomingPaymentId: String(paymentId),
      currentPaymentStatus: order.paymentStatus,
      currentOrderStatus: order.status,
    });
  }

  const mpStatusText = `${status ?? "unknown"}${statusDetail ? `:${statusDetail}` : ""}`;

  const paidAmount = safeNumber(payment?.transaction_amount);
  const paidCurrency = typeof payment?.currency_id === "string" ? payment.currency_id : "";

  const expectedAmount = safeNumber(order.total) / 100;
  const expectedCurrency = "ARS";

  if (!Number.isFinite(paidAmount) || !Number.isFinite(expectedAmount)) {
    console.error("MP payment o order.total inválidos", {
      paymentId,
      externalReference,
      paidAmountRaw: payment?.transaction_amount,
      expectedTotalRaw: order.total,
    });
    return { ok: true, ignored: "invalid_amount_data" };
  }

  // Tolerancia: mínimo $0.01 o el 0.1% del monto esperado (para cubrir redondeos acumulados en órdenes grandes)
  const tolerance = Math.max(0.01, expectedAmount * 0.001);
  const amountMismatch = Math.abs(paidAmount - expectedAmount) > tolerance;
  const currencyMismatch =
    Boolean(expectedCurrency && paidCurrency && paidCurrency !== expectedCurrency);

  if (amountMismatch || currencyMismatch) {
    console.error("MP payment mismatch", {
      paymentId,
      externalReference,
      status,
      statusDetail,
      paidAmount,
      expectedAmount,
      paidCurrency,
      expectedCurrency,
    });

    await prisma
      .$transaction(async (tx: any) => {
        await releaseReservation(tx, cs);

        await tx.checkoutSession.update({
          where: { id: cs.id },
          data: {
            status: "FAILED",
            mpPaymentId: String(paymentId),
            mpStatus: `mismatch:${mpStatusText}`,
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "FAILED",
            mpPaymentId: String(paymentId),
            mpStatus: `mismatch:${mpStatusText}`,
            status: "CANCELLED",
          },
        });
      })
      .catch((err: any) => {
        console.error("MP mismatch tx error", err);
      });

    return { ok: true, mismatch: true };
  }

  const myCollectorId = process.env.MERCADOPAGO_COLLECTOR_ID;
  const collectorId = payment?.collector_id != null ? String(payment.collector_id) : null;

  if (myCollectorId && collectorId && collectorId !== myCollectorId) {
    console.error("MP payment collector_id no coincide", {
      paymentId,
      externalReference,
      collectorId,
      myCollectorId,
    });

    await prisma
      .$transaction(async (tx: any) => {
        await releaseReservation(tx, cs);

        await tx.checkoutSession.update({
          where: { id: cs.id },
          data: {
            status: "FAILED",
            mpPaymentId: String(paymentId),
            mpStatus: `collector_mismatch:${mpStatusText}`,
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "FAILED",
            mpPaymentId: String(paymentId),
            mpStatus: `collector_mismatch:${mpStatusText}`,
            status: "CANCELLED",
          },
        });
      })
      .catch((err: any) => {
        console.error("MP collector mismatch tx error", err);
      });

    return { ok: true, collectorMismatch: true };
  }

  if (status === "approved") {
    const items = cs.itemsSnapshot as SnapshotItem[];

    if (!Array.isArray(items) || items.length === 0) {
      console.error("itemsSnapshot inválido o vacío en CheckoutSession", {
        checkoutSessionId: cs.id,
        orderId: order.id,
      });

      await prisma
        .$transaction(async (tx: any) => {
          await releaseReservation(tx, cs);

          await tx.checkoutSession.update({
            where: { id: cs.id },
            data: {
              status: "FAILED",
              mpPaymentId: String(paymentId),
              mpStatus: `snapshot_invalid:${mpStatusText}`,
            },
          });

          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: "FAILED",
              mpPaymentId: String(paymentId),
              mpStatus: `snapshot_invalid:${mpStatusText}`,
              status: "CANCELLED",
            },
          });
        })
        .catch((err: any) => {
          console.error("MP snapshot invalid tx error", err);
        });

      return { ok: true, snapshotInvalid: true };
    }

    try {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Guard atómico contra race conditions y webhooks duplicados (BUG 1 + BUG 7).
        // Se actualiza la orden a PAID PRIMERO usando updateMany con condición
        // paymentStatus: { not: "PAID" }. Si dos webhooks llegan al mismo tiempo,
        // solo uno obtendrá count=1; el otro verá count=0 y abortará la transacción
        // antes de tocar el stock, eliminando el doble descuento.
        const orderUpdate = await tx.order.updateMany({
          where: {
            id: order.id,
            paymentStatus: { not: "PAID" },
            status: { not: "CANCELLED" },
          },
          data: {
            status: "CONFIRMED",
            confirmedAt: new Date(),
            paymentMethod: "MERCADO_PAGO",
            paymentStatus: "PAID",
            paidAt: new Date(),
            mpPaymentId: String(paymentId),
            mpStatus: mpStatusText,
          },
        });

        if (orderUpdate.count === 0) {
          // count=0 por dos motivos: ya estaba PAID (webhook duplicado) o fue
          // cancelada antes de que llegara el pago (admin / expiración).
          const fresh = await tx.order.findUnique({
            where: { id: order.id },
            select: { status: true, paymentStatus: true },
          });
          if (fresh?.paymentStatus !== "PAID" && fresh?.status === "CANCELLED") {
            throw new Error("ORDER_CANCELLED");
          }
          throw new Error("ALREADY_PROCESSED");
        }

        for (const it of items) {
          if (it.comboId) {
            const comboQty = getComboReserveQty(it.quantity);
            const comboUpdated = await tx.combo.updateMany({
              where: { id: it.comboId, reservedStock: { gte: comboQty } },
              data: {
                stock: { decrement: comboQty },
                reservedStock: { decrement: comboQty },
              },
            });
            if (comboUpdated.count === 0) {
              throw new Error(`RESERVE_CONFIRM_FAILED:combo:${it.comboId}:${comboQty}`);
            }
            continue;
          }

          if (!it.productId) {
            throw new Error("PRODUCT_NOT_FOUND:missing_id");
          }

          const product = await tx.product.findUnique({
            where: { id: it.productId },
            select: { unitType: true, reservedStock: true },
          });

          if (!product) {
            throw new Error(`PRODUCT_NOT_FOUND:${it.productId}`);
          }

          const dec = getReserveQty(it.quantity, product.unitType);

          // Se valida solo reservedStock >= dec, no stock >= dec.
          // El stock fue reservado preventivamente al crear la preferencia;
          // si un admin ajustó stock manualmente, no debe bloquear una venta ya pagada.
          const updated = await tx.product.updateMany({
            where: {
              id: it.productId,
              reservedStock: { gte: dec },
            },
            data: {
              stock: { decrement: dec },
              reservedStock: { decrement: dec },
            },
          });

          if (updated.count === 0) {
            throw new Error(`RESERVE_CONFIRM_FAILED:${it.productId}:${dec}`);
          }
        }

        await tx.checkoutSession.update({
          where: { id: cs.id },
          data: {
            status: "APPROVED",
            mpPaymentId: String(paymentId),
            mpStatus: mpStatusText,
            approvedAt: new Date(),
            reservationReleased: true,
          },
        });
      });

      console.log("MP processPayment: approved confirmado", {
        paymentId,
        orderId: order.id,
        checkoutSessionId: cs.id,
      });

      // TELEGRAM (no bloquea la respuesta al webhook)
      prisma.order.findUnique({
        where: { id: order.id },
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
              itemNameSnapshot: true,
              product: { select: { name: true, unitType: true } },
            },
          },
        },
      }).then((fullOrder: any) => {
        if (!fullOrder) return;
        return sendTelegramMessage({
          text: buildTelegramOrderMessage({
            orderNumber: fullOrder.orderNumber,
            customerName: fullOrder.customerName ?? "",
            phone: fullOrder.phone ?? "",
            email: fullOrder.email,
            deliveryMethod: fullOrder.deliveryMethod as "PICKUP" | "DELIVERY",
            paymentMethod: "MERCADO_PAGO",
            address: fullOrder.address,
            pickupDate: fullOrder.pickupDate,
            pickupTimeSlot: fullOrder.pickupTimeSlot,
            subtotalCents: Number(fullOrder.subtotal),
            deliveryCostCents: Number(fullOrder.deliveryCost ?? 0),
            totalCents: Number(fullOrder.total),
            items: fullOrder.items.map((it: any) => ({
              name: it.itemNameSnapshot ?? it.product?.name ?? "",
              quantity: Number(it.quantity),
              unitType: (it.product?.unitType ?? "PER_UNIT") as "PER_KG" | "PER_UNIT",
              lineTotalCents: Number(it.lineTotal),
            })),
          }),
        });
      }).catch((e: any) => console.error("Telegram webhook error:", e));

      return { ok: true, confirmed: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);

      // Webhook duplicado o concurrente: la orden ya fue procesada por otra instancia.
      // No es un error — responder 200 para que MP no reintente.
      if (msg === "ALREADY_PROCESSED") {
        console.log("MP processPayment: webhook duplicado ignorado (orden ya procesada)", {
          paymentId,
          orderId: order.id,
        });
        return { ok: true, alreadyProcessed: true };
      }

      // Pago aprobado sobre una orden ya cancelada: no se toca stock ni estado.
      // La plata entró en MP y hay que devolverla a mano.
      if (msg === "ORDER_CANCELLED") {
        console.error("MP processPayment: pago aprobado en orden CANCELADA — requiere reembolso manual", {
          paymentId,
          orderId: order.id,
          paidAmount,
        });

        // TELEGRAM (no bloquea la respuesta al webhook)
        prisma.order
          .findUnique({ where: { id: order.id }, select: { orderNumber: true } })
          .then((o) =>
            sendTelegramMessage({
              text:
                `<b>⚠️ Pago recibido en orden cancelada #${o?.orderNumber ?? order.id}, requiere reembolso manual</b>\n` +
                `<b>Pago MP:</b> ${paymentId}\n` +
                `<b>Monto:</b> ${formatMoney(Math.round(paidAmount * 100))}`,
            })
          )
          .catch((err: unknown) => console.error("Telegram webhook error:", err));

        return { ok: true, cancelledOrderPaid: true };
      }

      console.error("Error confirmando Order desde webhook", e);

      const reserveConfirmFailed = msg.startsWith("RESERVE_CONFIRM_FAILED:");
      const productNotFound = msg.startsWith("PRODUCT_NOT_FOUND:");

      await prisma
        .$transaction(async (tx: any) => {
          await releaseReservation(tx, cs);

          await tx.checkoutSession.update({
            where: { id: cs.id },
            data: {
              status: "FAILED",
              mpPaymentId: String(paymentId),
              mpStatus: productNotFound
                ? `product_not_found:${mpStatusText}`
                : reserveConfirmFailed
                  ? `reserve_confirm_failed:${mpStatusText}`
                  : `tx_error:${mpStatusText}`,
            },
          });

          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: "FAILED",
              mpPaymentId: String(paymentId),
              mpStatus: productNotFound
                ? `product_not_found:${mpStatusText}`
                : reserveConfirmFailed
                  ? `reserve_confirm_failed:${mpStatusText}`
                  : `tx_error:${mpStatusText}`,
              status: "CANCELLED",
            },
          });
        })
        .catch((err: any) => {
          console.error("MP approved fallback tx error", err);
        });

      return {
        ok: true,
        reserveConfirmFailed,
        productNotFound,
      };
    }
  }

  if (status === "rejected" || status === "cancelled") {
    await prisma
      .$transaction(async (tx: any) => {
        await releaseReservation(tx, cs);

        await tx.checkoutSession.update({
          where: { id: cs.id },
          data: {
            status: "FAILED",
            mpPaymentId: String(paymentId),
            mpStatus: mpStatusText,
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "FAILED",
            mpPaymentId: String(paymentId),
            mpStatus: mpStatusText,
            status: "CANCELLED",
          },
        });
      })
      .catch((err: any) => {
        console.error("MP rejected/cancelled tx error", err);
      });

    console.log("MP processPayment: pago rechazado/cancelado", {
      paymentId,
      orderId: order.id,
      status,
    });

    return { ok: true, failed: true, status };
  }

  await prisma
    .$transaction([
      // updateMany con condición: un pago pendiente que llega tarde no debe
      // reabrir una sesión vencida/fallida ni una orden cancelada o pagada.
      prisma.checkoutSession.updateMany({
        where: { id: cs.id, status: { in: ["WAITING_MP", "PENDING"] } },
        data: {
          status: "PENDING",
          mpPaymentId: String(paymentId),
          mpStatus: mpStatusText,
        },
      }),
      prisma.order.updateMany({
        where: { id: order.id, status: { not: "CANCELLED" }, paymentStatus: { not: "PAID" } },
        data: {
          paymentStatus: "PENDING",
          mpPaymentId: String(paymentId),
          mpStatus: mpStatusText,
          status: "PENDING_PAYMENT",
        },
      }),
    ])
    .catch((err: any) => {
      console.error("MP pending tx error", err);
    });

  console.log("MP processPayment: estado pendiente", {
    paymentId,
    orderId: order.id,
    status,
    statusDetail,
  });

  return { ok: true, pending: true, status };
}

export type MpProcessResult = Awaited<ReturnType<typeof processMpPayment>>;

// Lo que usa el webhook: fetch + process, exactamente el flujo original.
export async function processMpPaymentById(paymentId: string, accessToken: string) {
  console.log("MP processPayment:start", { paymentId });

  const payment = await fetchMpPayment(paymentId, accessToken);
  if (!payment) {
    console.warn("MP processPayment: payment no encontrado en API de MP", { paymentId });
    return { ok: true, ignored: "payment_not_found" };
  }

  return processMpPayment(paymentId, payment);
}

async function searchMpPaymentsByOrder(
  orderId: string,
  accessToken: string
): Promise<{ ok: true; payments: MpPayment[] } | { ok: false; message: string }> {
  const url = new URL("https://api.mercadopago.com/v1/payments/search");
  url.searchParams.set("external_reference", orderId);
  url.searchParams.set("sort", "date_created");
  url.searchParams.set("criteria", "desc");
  url.searchParams.set("limit", "50");

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch (err) {
    return { ok: false, message: `error de red: ${err instanceof Error ? err.message : String(err)}` };
  }

  if (!res.ok) return { ok: false, message: `MP respondió HTTP ${res.status}` };

  const body = (await res.json().catch(() => null)) as { results?: unknown } | null;
  if (!body || !Array.isArray(body.results)) {
    return { ok: false, message: "respuesta de MP sin results" };
  }

  const payments = (body.results as MpPayment[]).filter((p) => p.external_reference === orderId);
  return { ok: true, payments };
}

export type MpVerifyResult =
  | { outcome: "order_not_found"; message: string }
  | { outcome: "not_mercado_pago"; message: string }
  | { outcome: "already_paid"; message: string }
  | { outcome: "no_payment"; message: string }
  | { outcome: "mp_error"; message: string }
  | {
      outcome: "not_approved";
      paymentId: string;
      mpStatus: string;
      mpStatusDetail: string | null;
      message: string;
    }
  | {
      outcome: "processed";
      paymentId: string;
      mpStatus: "approved";
      result: MpProcessResult;
      message: string;
    };

function describeProcessResult(r: MpProcessResult): string {
  if ("confirmed" in r && r.confirmed) {
    return "Pago aprobado en Mercado Pago. Orden confirmada y stock descontado.";
  }
  if ("alreadyProcessed" in r && r.alreadyProcessed) {
    return "Pago aprobado; la orden ya estaba procesada. No se duplicó nada.";
  }
  if ("cancelledOrderPaid" in r && r.cancelledOrderPaid) {
    return "Pago APROBADO sobre una orden CANCELADA: requiere reembolso manual. Se envió alerta por Telegram.";
  }
  if ("mismatch" in r && r.mismatch) {
    return "Pago aprobado pero el monto/moneda no coincide con la orden. La orden quedó cancelada (igual que en el webhook).";
  }
  if ("collectorMismatch" in r && r.collectorMismatch) {
    return "Pago aprobado pero a otra cuenta de cobro. La orden quedó cancelada (igual que en el webhook).";
  }
  if ("snapshotInvalid" in r && r.snapshotInvalid) {
    return "Pago aprobado pero la sesión de checkout no tiene ítems. La orden quedó cancelada.";
  }
  if ("reserveConfirmFailed" in r || "productNotFound" in r) {
    return "Pago aprobado pero no se pudo confirmar el stock. La orden quedó cancelada; revisar a mano.";
  }
  return "Pago aprobado; resultado no reconocido, revisar logs.";
}

/**
 * Respaldo manual del webhook: consulta el pago real en MP y, SOLO si está
 * approved, lo aplica con processMpPayment (el mismo guard atómico del webhook).
 * Si no está approved no escribe nada.
 */
export async function verifyMpPaymentForOrder(
  orderId: string,
  accessToken: string
): Promise<MpVerifyResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, paymentMethod: true, paymentStatus: true, mpPaymentId: true },
  });

  if (!order) return { outcome: "order_not_found", message: "Orden no encontrada" };

  if (order.paymentMethod !== "MERCADO_PAGO") {
    return { outcome: "not_mercado_pago", message: "La orden no es de Mercado Pago" };
  }

  if (order.paymentStatus === "PAID") {
    return {
      outcome: "already_paid",
      message: "La orden ya estaba confirmada como pagada. No se tocó nada.",
    };
  }

  const cs = await findCheckoutSessionForOrder(order.id);
  const storedPaymentId = cs?.mpPaymentId ?? order.mpPaymentId;

  let payment: MpPayment | null = storedPaymentId
    ? await fetchMpPayment(storedPaymentId, accessToken)
    : null;

  // Sin mpPaymentId (el webhook nunca llegó), o el guardado no está aprobado:
  // buscar por external_reference por si hubo otro intento que sí se aprobó.
  if (!payment || payment.status !== "approved") {
    const search = await searchMpPaymentsByOrder(order.id, accessToken);

    if (!search.ok && !payment) {
      return { outcome: "mp_error", message: `No se pudo consultar Mercado Pago (${search.message})` };
    }

    if (search.ok) {
      const approved = search.payments.find((p) => p.status === "approved");
      if (approved) payment = approved;
      else if (!payment) payment = search.payments[0] ?? null;
    }
  }

  if (!payment || payment.id == null) {
    return { outcome: "no_payment", message: "Sin pago registrado en Mercado Pago para esta orden" };
  }

  const paymentId = String(payment.id);
  const mpStatus = payment.status ?? "unknown";

  if (mpStatus !== "approved") {
    const detail = payment.status_detail ?? null;
    return {
      outcome: "not_approved",
      paymentId,
      mpStatus,
      mpStatusDetail: detail,
      message: `Mercado Pago informa el pago ${paymentId} como "${mpStatus}"${detail ? ` (${detail})` : ""}. No se modificó la orden.`,
    };
  }

  // Releer por GET el pago elegido, para no confirmar en base al resultado de search.
  const canonical = await fetchMpPayment(paymentId, accessToken);
  if (!canonical || canonical.status !== "approved") {
    return {
      outcome: "mp_error",
      message: `No se pudo reconfirmar el pago ${paymentId} en Mercado Pago`,
    };
  }

  const result = await processMpPayment(paymentId, canonical);

  return {
    outcome: "processed",
    paymentId,
    mpStatus: "approved",
    result,
    message: describeProcessResult(result),
  };
}
