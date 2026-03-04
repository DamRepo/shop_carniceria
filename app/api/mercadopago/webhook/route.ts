import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SnapshotItem = {
  productId: string;
  quantity: number; // PER_UNIT: unidades (int). PER_KG: kg (float) según tu preference
  unitPrice: number; // cents
  lineTotal: number; // cents
  // mejora opcional: stockDecrement?: number;
};

async function fetchPayment(paymentId: string, accessToken: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("MP payment fetch error:", res.status, detail);
    return null;
  }

  return res.json();
}

function safeNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : NaN;
}

async function processPayment(paymentId: string, accessToken: string) {
  const payment = await fetchPayment(paymentId, accessToken);
  if (!payment) return { ok: true };

  const status: string | undefined = payment?.status; // approved / rejected / cancelled / in_process...
  const externalReference: string | undefined = payment?.external_reference; // <-- cs.id
  const statusDetail: string | undefined = payment?.status_detail;

  if (!externalReference) {
    console.error("MP payment sin external_reference:", paymentId);
    return { ok: true };
  }

  const cs = await prisma.checkoutSession.findUnique({
    where: { id: externalReference },
  });

  if (!cs) {
    console.error("CheckoutSession no encontrada:", externalReference);
    return { ok: true };
  }

  // ✅ idempotencia robusta: si ya creó una orden, no repetir
  if (cs.orderId) {
    return { ok: true, alreadyProcessed: true };
  }

  // Guardamos algunos datos del pago en la sesión (para debug / trazabilidad)
  const mpStatusText = `${status ?? "unknown"}${statusDetail ? `:${statusDetail}` : ""}`;

  // ✅ Validaciones fuertes: monto + moneda (+ opcional: collector_id)
  // MP transaction_amount suele estar en "moneda" (ej ARS), no cents.
  // Tu cs.total se maneja como cents, por eso / 100.
  const paidAmount = safeNumber(payment?.transaction_amount);
  const paidCurrency = typeof payment?.currency_id === "string" ? payment.currency_id : "";

  const expectedAmount = safeNumber(cs.total) / 100;
  const expectedCurrency = "ARS"; // ajustá si aplica

  if (!Number.isFinite(paidAmount) || !Number.isFinite(expectedAmount)) {
    console.error("MP payment o cs.total inválidos:", {
      paymentId,
      externalReference,
      paidAmount: payment?.transaction_amount,
      expectedTotal: cs.total,
    });
    return { ok: true };
  }

  // Tolerancia mínima por redondeos
  const tolerance = 0.01;

  const amountMismatch = Math.abs(paidAmount - expectedAmount) > tolerance;
  const currencyMismatch = Boolean(expectedCurrency && paidCurrency && paidCurrency !== expectedCurrency);

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

    await prisma.checkoutSession
      .update({
        where: { id: cs.id },
        data: {
          status: "FAILED",
          mpPaymentId: String(paymentId),
          mpStatus: `mismatch:${mpStatusText}`,
        },
      })
      .catch(() => {});

    return { ok: true, mismatch: true };
  }

  // ✅ Validación opcional: payment pertenece a tu cuenta (collector_id)
  // Si querés activar esto, agregá MERCADOPAGO_COLLECTOR_ID en tu .env
  const myCollectorId = process.env.MERCADOPAGO_COLLECTOR_ID;
  const collectorId = payment?.collector_id != null ? String(payment.collector_id) : null;

  if (myCollectorId && collectorId && collectorId !== myCollectorId) {
    console.error("MP payment collector_id no coincide", {
      paymentId,
      externalReference,
      collectorId,
      myCollectorId,
    });

    await prisma.checkoutSession
      .update({
        where: { id: cs.id },
        data: {
          status: "FAILED",
          mpPaymentId: String(paymentId),
          mpStatus: `collector_mismatch:${mpStatusText}`,
        },
      })
      .catch(() => {});

    return { ok: true, collectorMismatch: true };
  }

  if (status === "approved") {
    const items = cs.itemsSnapshot as unknown as SnapshotItem[];

    if (!Array.isArray(items) || items.length === 0) {
      console.error("itemsSnapshot inválido o vacío en CheckoutSession:", cs.id);
      // Marcamos failed porque no podemos construir la Order
      await prisma.checkoutSession
        .update({
          where: { id: cs.id },
          data: {
            status: "FAILED",
            mpPaymentId: String(paymentId),
            mpStatus: `snapshot_invalid:${mpStatusText}`,
          },
        })
        .catch(() => {});
      return { ok: true };
    }

    try {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1) crear la Order real
        const order = await tx.order.create({
          data: {
            userId: cs.userId ?? null,
            customerName: cs.customerName,
            phone: cs.phone,
            email: cs.email ?? undefined,

            deliveryMethod: cs.deliveryMethod,
            address: cs.address ?? undefined,
            addressDetails: cs.addressDetails ?? undefined,
            city: cs.city ?? undefined,
            postalCode: cs.postalCode ?? undefined,
            notes: cs.notes ?? undefined,

            // Estado operativo
            status: "CONFIRMED",
            confirmedAt: new Date(),

            // Pago
            paymentMethod: "MERCADO_PAGO",
            paymentStatus: "PAID",
            paidAt: new Date(),
            mpPaymentId: String(paymentId),
            mpStatus: mpStatusText,

            subtotal: cs.subtotal,
            deliveryCost: cs.deliveryCost,
            total: cs.total,

            items: {
              create: items.map((it) => ({
                productId: it.productId,
                quantity: Number(it.quantity),
                unitPrice: Number(it.unitPrice),
                lineTotal: Number(it.lineTotal),
              })),
            },
          },
        });

        // 2) descontar stock (ATÓMICO: evita stock negativo y overselling)
        for (const it of items) {
          const product = await tx.product.findUnique({
            where: { id: it.productId },
            select: { unitType: true },
          });

          if (!product) continue;

          let dec: number;

          if (product.unitType === "PER_UNIT") {
            dec = Math.max(1, Math.round(Number(it.quantity ?? 0)));
          } else {
            // PER_KG (mínimo seguro)
            dec = Math.max(1, Math.ceil(Number(it.quantity ?? 0)));
          }

          // ✅ UPDATE ATÓMICO: solo decrementa si hay stock suficiente
          const updated = await tx.product.updateMany({
            where: {
              id: it.productId,
              stock: { gte: dec },
            },
            data: {
              stock: { decrement: dec },
            },
          });

          if (updated.count === 0) {
            // Prefijo para diferenciar en el catch
            throw new Error(`OUT_OF_STOCK:${it.productId}:${dec}`);
          }
        }

        // 3) marcar la sesión como aprobada y vincularla a la order
        await tx.checkoutSession.update({
          where: { id: cs.id },
          data: {
            status: "APPROVED",
            orderId: order.id,
            mpPaymentId: String(paymentId),
            mpStatus: mpStatusText,
            approvedAt: new Date(),
          },
        });
      });

      return { ok: true, confirmed: true };
    } catch (e) {
      console.error("Error creando Order desde webhook:", e);

      const msg = e instanceof Error ? e.message : String(e);
      const outOfStock = msg.startsWith("OUT_OF_STOCK:");

      // No devolvemos error a MP; devolvemos ok para que no reintente infinito sin control
      await prisma.checkoutSession
        .update({
          where: { id: cs.id },
          data: {
            status: "FAILED",
            mpPaymentId: String(paymentId),
            mpStatus: outOfStock ? `out_of_stock:${mpStatusText}` : `tx_error:${mpStatusText}`,
          },
        })
        .catch(() => {});

      return { ok: true, outOfStock };
    }
  }

  if (status === "rejected" || status === "cancelled") {
    await prisma.checkoutSession
      .update({
        where: { id: cs.id },
        data: {
          status: "FAILED",
          mpPaymentId: String(paymentId),
          mpStatus: mpStatusText,
        },
      })
      .catch(() => {});
    return { ok: true, failed: true, status };
  }

  // pending / in_process / etc.
  await prisma.checkoutSession
    .update({
      where: { id: cs.id },
      data: {
        status: "PENDING",
        mpPaymentId: String(paymentId),
        mpStatus: mpStatusText,
      },
    })
    .catch(() => {});

  return { ok: true, pending: true, status };
}

export async function POST(req: NextRequest) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: "Falta MERCADOPAGO_ACCESS_TOKEN" }, { status: 500 });
  }

  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    // MP a veces manda vacío/extraño; devolvemos ok
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const type = payload?.type;
  const paymentId = payload?.data?.id;

  if (type !== "payment" || !paymentId) {
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  const result = await processPayment(String(paymentId), accessToken);
  return NextResponse.json(result, { status: 200 });
}

// Por compatibilidad: MP a veces pega por GET con query params
export async function GET(req: NextRequest) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: "Falta MERCADOPAGO_ACCESS_TOKEN" }, { status: 500 });
  }

  const sp = req.nextUrl.searchParams;
  const topic = sp.get("topic") || sp.get("type");
  const paymentId = sp.get("id") || sp.get("data.id");

  if (topic !== "payment" || !paymentId) {
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  const result = await processPayment(String(paymentId), accessToken);
  return NextResponse.json(result, { status: 200 });
}