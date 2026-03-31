import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { sendTelegramMessage, buildTelegramOrderMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SnapshotItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type WebhookNotification = {
  topic: string | null;
  paymentId: string | null;
  rawBody: string | null;
  payload: any;
};

async function fetchPayment(paymentId: string, accessToken: string) {
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

function jsonOk(data: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...data }, { status: 200 });
}

function parseJsonSafely(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readWebhookNotification(req: NextRequest): Promise<WebhookNotification> {
  const url = new URL(req.url);
  const sp = url.searchParams;

  let rawBody: string | null = null;
  let payload: any = null;

  rawBody = await req.text().catch(() => "");
  if (rawBody && rawBody.trim()) {
    payload = parseJsonSafely(rawBody);
  }

  const topicFromBody = payload?.type ?? payload?.topic ?? null;
  const paymentIdFromBody =
    payload?.data?.id != null
      ? String(payload.data.id)
      : payload?.id != null
      ? String(payload.id)
      : null;

  const topicFromQuery = sp.get("topic") || sp.get("type");
  const paymentIdFromQuery = sp.get("id") || sp.get("data.id");

  return {
    topic: topicFromBody ?? topicFromQuery ?? null,
    paymentId: paymentIdFromBody ?? paymentIdFromQuery ?? null,
    rawBody,
    payload,
  };
}

function extractSignatureParts(signatureHeader: string | null) {
  if (!signatureHeader) return null;

  const parts = signatureHeader.split(",");
  let ts: string | null = null;
  let v1: string | null = null;

  for (const part of parts) {
    const [rawKey, rawValue] = part.split("=");
    const key = rawKey?.trim();
    const value = rawValue?.trim();

    if (key === "ts") ts = value ?? null;
    if (key === "v1") v1 = value ?? null;
  }

  if (!ts || !v1) return null;
  return { ts, v1 };
}

function safeEqualHex(a: string, b: string) {
  const aBuf = Buffer.from(a.toLowerCase(), "hex");
  const bBuf = Buffer.from(b.toLowerCase(), "hex");

  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyMercadoPagoSignature(params: {
  secret: string;
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}) {
  const { secret, xSignature, xRequestId, dataId } = params;

  if (!secret || !xSignature || !xRequestId || !dataId) {
    return false;
  }

  const parsed = extractSignatureParts(xSignature);
  if (!parsed) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${parsed.ts};`;

  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  return safeEqualHex(expected, parsed.v1);
}

async function releaseReservation(
  tx: Prisma.TransactionClient,
  cs: {
    id: string;
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

  const items = cs.itemsSnapshot as SnapshotItem[];

  if (!Array.isArray(items) || items.length === 0) {
    console.warn("releaseReservation: itemsSnapshot vacío o inválido", {
      checkoutSessionId: cs.id,
    });
    return;
  }

  for (const it of items) {
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
      itemsSnapshot: true,
      reservationReleased: true,
      expiresAt: true,
      mpPaymentId: true,
      mpStatus: true,
      status: true,
    },
  });
}

async function processPayment(paymentId: string, accessToken: string) {
  console.log("MP processPayment:start", { paymentId });

  const payment = await fetchPayment(paymentId, accessToken);
  if (!payment) {
    console.warn("MP processPayment: payment no encontrado en API de MP", { paymentId });
    return { ok: true, ignored: "payment_not_found" };
  }

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
          where: { id: order.id, paymentStatus: { not: "PAID" } },
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
          throw new Error("ALREADY_PROCESSED");
        }

        for (const it of items) {
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
          city: true,
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
      }).then((fullOrder: any) => {
        if (!fullOrder) return;
        return sendTelegramMessage({
          text: buildTelegramOrderMessage({
            orderNumber: fullOrder.orderNumber,
            customerName: fullOrder.customerName ?? "",
            phone: fullOrder.phone ?? "",
            email: fullOrder.email,
            deliveryMethod: fullOrder.deliveryMethod as "PICKUP" | "DELIVERY",
            address: fullOrder.address,
            city: fullOrder.city,
            pickupDate: fullOrder.pickupDate,
            pickupTimeSlot: fullOrder.pickupTimeSlot,
            subtotalCents: Number(fullOrder.subtotal),
            deliveryCostCents: Number(fullOrder.deliveryCost ?? 0),
            totalCents: Number(fullOrder.total),
            items: fullOrder.items.map((it: any) => ({
              name: it.product?.name ?? "",
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
      prisma.checkoutSession.update({
        where: { id: cs.id },
        data: {
          status: "PENDING",
          mpPaymentId: String(paymentId),
          mpStatus: mpStatusText,
        },
      }),
      prisma.order.update({
        where: { id: order.id },
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

export async function POST(req: NextRequest) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Falta MERCADOPAGO_ACCESS_TOKEN" },
      { status: 500 }
    );
  }

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Falta MERCADOPAGO_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  const notification = await readWebhookNotification(req);

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  const isValidSignature = verifyMercadoPagoSignature({
    secret: webhookSecret,
    xSignature,
    xRequestId,
    dataId: notification.paymentId,
  });

  if (!isValidSignature) {
    console.warn("MP webhook firma inválida", {
      url: req.url,
      topic: notification.topic,
      paymentId: notification.paymentId,
      hasXSignature: Boolean(xSignature),
      hasXRequestId: Boolean(xRequestId),
    });

    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  console.log("MP webhook POST validado", {
    url: req.url,
    topic: notification.topic,
    paymentId: notification.paymentId,
    xRequestId,  // Loguear para detectar reintentos duplicados de MP en los logs
  });

  if (notification.topic !== "payment" || !notification.paymentId) {
    return jsonOk({
      ignored: true,
      reason: "unsupported_topic_or_missing_payment_id",
      topic: notification.topic,
      paymentId: notification.paymentId,
    });
  }

  const result = await processPayment(notification.paymentId, accessToken);
  return NextResponse.json(result, { status: 200 });
}