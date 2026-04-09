import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getShippingCost, isValidShippingZone } from "@/lib/shipping";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BodyItem = { productId: string; quantity: number };

type Body = {
  customerName: string;
  phone: string;
  email?: string;
  deliveryMethod: "PICKUP" | "DELIVERY";
  deliveryZone?: string;
  address?: string;
  addressDetails?: string;
  notes?: string;

  pickupDate?: string;
  pickupTimeSlot?: string;
  pickupNotes?: string;

  items: BodyItem[];
};

type ProductPick = {
  id: string;
  name: string;
  price: number;
  salePrice: number | null;
  isOnSale: boolean;
  saleEndDate: Date | null;
  stock: number;
  reservedStock: number;
  unitType: "PER_KG" | "PER_UNIT";
  minPurchaseQty: number | null;
  qtyStep: number | null;
  maxPurchaseQty: number | null;
  allowsDecimals: boolean;
};

type ReservationItem = {
  productId: string;
  reserveQty: number;
};

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parsePickupDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("La fecha de retiro no es válida");
  }
  return parsed;
}

function safeNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function isSaleActive(p: {
  isOnSale: boolean;
  salePrice: number | null;
  saleEndDate: Date | null;
}) {
  if (!p.isOnSale || p.salePrice == null) return false;
  if (!p.saleEndDate) return true;
  return p.saleEndDate.getTime() > Date.now();
}

function getEffectivePrice(p: {
  price: number;
  salePrice: number | null;
  isOnSale: boolean;
  saleEndDate: Date | null;
}) {
  return isSaleActive(p) ? Number(p.salePrice) : Number(p.price);
}

function nearlyInteger(n: number) {
  return Math.abs(n - Math.round(n)) < 1e-9;
}

function isValidStep(qty: number, min: number, step: number) {
  const delta = (qty - min) / step;
  return Math.abs(delta - Math.round(delta)) < 1e-9;
}

function validateProductQuantity(
  p: {
    name: string;
    unitType: "PER_KG" | "PER_UNIT";
    minPurchaseQty: number | null;
    qtyStep: number | null;
    maxPurchaseQty: number | null;
    allowsDecimals: boolean;
  },
  qty: number
) {
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error(`Cantidad inválida para ${p.name}`);
  }
  if (p.unitType === "PER_KG") {
  if (qty < 0.01) {
    throw new Error(`${p.name} mínimo 10 gramos`);
  }
}
  const min = Number(p.minPurchaseQty ?? 1);
  const step = Number(p.qtyStep ?? 1);
  const max = p.maxPurchaseQty != null ? Number(p.maxPurchaseQty) : null;

  if (qty < min) {
    throw new Error(
      `${p.name} tiene compra mínima de ${min} ${
        p.unitType === "PER_KG" ? "kg" : "unidades"
      }`
    );
  }

  if (max != null && qty > max) {
    throw new Error(
      `${p.name} permite como máximo ${max} ${
        p.unitType === "PER_KG" ? "kg" : "unidades"
      }`
    );
  }

  if (!isValidStep(qty, min, step)) {
    throw new Error(
      `${p.name} debe comprarse en múltiplos de ${step} ${
        p.unitType === "PER_KG" ? "kg" : "unidades"
      }`
    );
  }

  if (p.unitType === "PER_UNIT" && !nearlyInteger(qty)) {
    throw new Error(`${p.name} solo permite unidades enteras`);
  }

  if (p.unitType === "PER_KG" && !p.allowsDecimals && !nearlyInteger(qty)) {
    throw new Error(`${p.name} no permite fracciones`);
  }
}

function centsToPesos(cents: number) {
  return Number((cents / 100).toFixed(2));
}

function getMpTitle(p: ProductPick, qty: number) {
  const offerActive = isSaleActive(p);
  const min = Number(p.minPurchaseQty ?? 0);
  const step = Number(p.qtyStep ?? 0);

  if (offerActive && p.unitType === "PER_KG" && min >= 2 && step >= 2) {
    return `${p.name} - Promo x ${qty} kg`;
  }

  if (offerActive && p.unitType === "PER_UNIT" && min >= 2) {
    return `${p.name} - Promo x ${qty} un`;
  }

  if (p.unitType === "PER_KG") {
    const grams = Math.round(qty * 1000);
    return `${p.name} (${grams} g)`;
  }

  return p.name;
}

/**
 * Modelo consistente de stock/reserva:
 * - PER_UNIT => unidades enteras
 * - PER_KG   => gramos enteros en DB
 */
function getReserveQty(unitType: "PER_KG" | "PER_UNIT", qty: number) {
  if (unitType === "PER_UNIT") {
    const units = Math.round(qty);

    if (units <= 0) {
      throw new Error("Cantidad inválida en unidades");
    }

    return units;
  }

  const grams = Math.round(qty * 1000);

  if (grams <= 0) {
    throw new Error("Cantidad inválida en gramos");
  }

  return grams;
}

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const { success } = rateLimit(`mp-pref:${ip}`, 5, 10 * 60 * 1000);
    if (!success) {
      return NextResponse.json(
        { error: "Demasiados intentos. Esperá unos minutos." },
        { status: 429 }
      );
    }

    const body = (await req.json()) as Body;

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!accessToken || !siteUrl) {
      return NextResponse.json(
        { error: "Faltan MERCADOPAGO_ACCESS_TOKEN o NEXT_PUBLIC_SITE_URL" },
        { status: 500 }
      );
    }

    const customerName = normalizeString(body?.customerName);
    const phone = normalizeString(body?.phone);
    const email = normalizeString(body?.email)?.toLowerCase() ?? null;
    const deliveryMethod = body?.deliveryMethod;

    if (deliveryMethod !== "PICKUP" && deliveryMethod !== "DELIVERY") {
      return NextResponse.json(
        { error: "Método de entrega inválido" },
        { status: 400 }
      );
    }

    const deliveryZoneRaw = normalizeString(body?.deliveryZone);
    const address = normalizeString(body?.address);
    const addressDetails = normalizeString(body?.addressDetails);
    const notes = normalizeString(body?.notes);

    const pickupDateRaw = normalizeString(body?.pickupDate);
    const pickupTimeSlot = normalizeString(body?.pickupTimeSlot);
    const pickupNotes = normalizeString(body?.pickupNotes);

    if (!customerName || !phone || !deliveryMethod || !body?.items?.length) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    if (body.items.length > 100) {
      return NextResponse.json({ error: "Demasiados productos en la orden" }, { status: 400 });
    }

    if (deliveryMethod === "DELIVERY") {
      if (!isValidShippingZone(deliveryZoneRaw)) {
        return NextResponse.json(
          { error: "Zona de envío inválida" },
          { status: 400 }
        );
      }
      if (!address) {
        return NextResponse.json(
          { error: "Dirección requerida para delivery" },
          { status: 400 }
        );
      }
      if (address.length < 5) {
        return NextResponse.json(
          { error: "La dirección debe tener al menos 5 caracteres" },
          { status: 400 }
        );
      }
    }

    if (deliveryMethod === "PICKUP") {
      if (!pickupDateRaw || !pickupTimeSlot) {
        return NextResponse.json(
          { error: "Debés seleccionar día y horario de retiro" },
          { status: 400 }
        );
      }
    }

    const pickupDate =
      deliveryMethod === "PICKUP" ? parsePickupDate(pickupDateRaw) : undefined;

    const session = await getServerSession(authOptions).catch(() => null);
    const userId = (session?.user as any)?.id as string | undefined;
    const sessionEmail =
      typeof (session?.user as any)?.email === "string"
        ? ((session?.user as any).email as string)
        : undefined;

    const resolvedEmail = email ?? sessionEmail?.trim().toLowerCase() ?? null;

    const ids = body.items.map((i) => i.productId);

    const products = (await prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
      select: {
        id: true,
        name: true,
        price: true,
        salePrice: true,
        isOnSale: true,
        saleEndDate: true,
        stock: true,
        reservedStock: true,
        unitType: true,
        minPurchaseQty: true,
        qtyStep: true,
        maxPurchaseQty: true,
        allowsDecimals: true,
      },
    })) as ProductPick[];

    const byId = new Map<string, ProductPick>(products.map((p) => [p.id, p]));

    let subtotalCents = 0;

    const itemsSnapshot: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }> = [];

    const reservationItems: ReservationItem[] = [];

    const mpItems = body.items.map((i) => {
      const p = byId.get(i.productId);
      if (!p) throw new Error(`Producto no encontrado: ${i.productId}`);

      const qty = safeNumber(i.quantity);
      validateProductQuantity(p, qty);

      const priceCents = getEffectivePrice(p);
      if (!Number.isFinite(priceCents) || priceCents < 0) {
        throw new Error(`Precio inválido para ${p.name}`);
      }

      const reserveQty = getReserveQty(p.unitType, qty);
      const availableNow = Math.max(0, (p.stock ?? 0) - (p.reservedStock ?? 0));

      if (availableNow < reserveQty) {
        throw new Error(`Stock insuficiente para ${p.name}`);
      }

      reservationItems.push({
        productId: p.id,
        reserveQty,
      });

      if (p.unitType === "PER_KG") {
        // Multiplicar directo en kg para evitar error acumulado de la conversión a gramos
        const lineCents = Math.round(priceCents * qty);
        subtotalCents += lineCents;
        // Mantener grams solo para el título descriptivo de MP
        const grams = Math.round(qty * 1000);

        itemsSnapshot.push({
          productId: p.id,
          quantity: qty,
          unitPrice: priceCents,
          lineTotal: lineCents,
        });

        const promoAsCombo =
          isSaleActive(p) &&
          Number(p.minPurchaseQty ?? 0) >= 2 &&
          Number(p.qtyStep ?? 0) >= 2;

        if (promoAsCombo) {
          return {
            title: getMpTitle(p, qty),
            quantity: 1,
            unit_price: centsToPesos(lineCents),
            currency_id: "ARS",
          };
        }

        return {
          title: getMpTitle(p, qty),
          quantity: 1,
          unit_price: centsToPesos(lineCents),
          currency_id: "ARS",
        };
      }

      const units = Math.round(qty);
      if (units <= 0) {
        throw new Error(`Cantidad inválida para ${p.name}`);
      }

      const lineCents = Math.round(priceCents * units);
      subtotalCents += lineCents;

      itemsSnapshot.push({
        productId: p.id,
        quantity: units,
        unitPrice: priceCents,
        lineTotal: lineCents,
      });

      const promoAsCombo =
        isSaleActive(p) && Number(p.minPurchaseQty ?? 0) >= 2;

      if (promoAsCombo) {
        return {
          title: getMpTitle(p, units),
          quantity: 1,
          unit_price: centsToPesos(lineCents),
          currency_id: "ARS",
        };
      }

      return {
        title: p.name,
        quantity: units,
        unit_price: centsToPesos(priceCents),
        currency_id: "ARS",
      };
    });

    const deliveryCostCents =
      deliveryMethod === "DELIVERY" && isValidShippingZone(deliveryZoneRaw)
        ? getShippingCost(deliveryZoneRaw)
        : 0;

    const totalCents = subtotalCents + deliveryCostCents;

    const reservationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const { order, cs } = await prisma.$transaction(async (tx: any) => {
      // Revalidación atómica antes de reservar
      for (const r of reservationItems) {
        const product = await tx.product.findUnique({
          where: { id: r.productId },
          select: { id: true, name: true, stock: true, reservedStock: true },
        });

        if (!product) {
          throw new Error(`Producto no encontrado: ${r.productId}`);
        }

        const available = Math.max(0, product.stock - product.reservedStock);
        if (available < r.reserveQty) {
          throw new Error(`Stock insuficiente para ${product.name}`);
        }
      }

      // Reservar stock con optimistic locking
      for (const r of reservationItems) {
        const product = await tx.product.findUnique({
          where: { id: r.productId },
          select: { id: true, name: true, stock: true, reservedStock: true },
        });

        if (!product) {
          throw new Error(`Producto no encontrado: ${r.productId}`);
        }

        const available = Math.max(0, product.stock - product.reservedStock);

        if (available < r.reserveQty) {
          throw new Error(`Stock insuficiente para ${product.name}`);
        }

        const updated = await tx.product.updateMany({
          where: {
            id: r.productId,
            stock: product.stock,
            reservedStock: product.reservedStock,
          },
          data: {
            reservedStock: { increment: r.reserveQty },
          },
        });

        if (updated.count === 0) {
          throw new Error(`No se pudo reservar stock para ${product.name}`);
        }
      }

      const order = await tx.order.create({
        data: {
          userId: userId ?? null,

          customerName,
          phone,
          email: resolvedEmail,

          deliveryMethod,
          address:
            deliveryMethod === "DELIVERY" ? address ?? undefined : undefined,
          addressDetails:
            deliveryMethod === "DELIVERY"
              ? addressDetails ?? undefined
              : undefined,
          notes: notes ?? undefined,

          pickupDate:
            deliveryMethod === "PICKUP" ? pickupDate ?? undefined : undefined,
          pickupTimeSlot:
            deliveryMethod === "PICKUP"
              ? pickupTimeSlot ?? undefined
              : undefined,
          pickupNotes:
            deliveryMethod === "PICKUP"
              ? pickupNotes ?? undefined
              : undefined,

          status: "PENDING_PAYMENT",
          paymentMethod: "MERCADO_PAGO",
          paymentStatus: "PENDING",

          subtotal: subtotalCents,
          deliveryCost: deliveryCostCents,
          total: totalCents,

          items: {
            create: itemsSnapshot.map((it) => ({
              productId: it.productId,
              quantity: Number(it.quantity),
              unitPrice: Number(it.unitPrice),
              lineTotal: Number(it.lineTotal),
            })),
          },
        },
      });

      const cs = await tx.checkoutSession.create({
        data: {
          userId: userId ?? null,

          customerName,
          phone,
          email: resolvedEmail,

          deliveryMethod,
          address:
            deliveryMethod === "DELIVERY" ? address ?? undefined : undefined,
          addressDetails:
            deliveryMethod === "DELIVERY"
              ? addressDetails ?? undefined
              : undefined,
          notes: notes ?? undefined,

          pickupDate:
            deliveryMethod === "PICKUP" ? pickupDate ?? undefined : undefined,
          pickupTimeSlot:
            deliveryMethod === "PICKUP"
              ? pickupTimeSlot ?? undefined
              : undefined,
          pickupNotes:
            deliveryMethod === "PICKUP"
              ? pickupNotes ?? undefined
              : undefined,

          itemsSnapshot,
          subtotal: subtotalCents,
          deliveryCost: deliveryCostCents,
          total: totalCents,

          status: "WAITING_MP",
          orderId: order.id,
          expiresAt: reservationExpiresAt,
          reservationReleased: false,
        },
      });

      return { order, cs };
    });

    const itemsToSend =
      deliveryCostCents > 0
        ? [
            ...mpItems,
            {
              title: "Envío a domicilio",
              quantity: 1,
              unit_price: centsToPesos(deliveryCostCents),
              currency_id: "ARS",
            },
          ]
        : mpItems;

    // Helper para liberar la reserva y cancelar la orden/sesión cuando MP falla
    // antes de que se cree la preferencia (sin webhook de respaldo).
    async function rollbackMpFailure(reason: string) {
      await prisma
        .$transaction(async (tx: any) => {
          for (const r of reservationItems) {
            await tx.product.updateMany({
              where: { id: r.productId, reservedStock: { gte: r.reserveQty } },
              data: { reservedStock: { decrement: r.reserveQty } },
            });
          }
          await tx.checkoutSession.update({
            where: { id: cs.id },
            data: { status: "FAILED", mpStatus: reason, reservationReleased: true },
          });
          await tx.order.update({
            where: { id: order.id },
            data: { paymentStatus: "FAILED", mpStatus: reason, status: "CANCELLED" },
          });
        })
        .catch((err: any) =>
          console.error("Error en rollback de preferencia MP:", err, { reason })
        );
    }

    let mpRes: Response;
    try {
      mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: itemsToSend,
          external_reference: order.id,
          back_urls: {
            success: `${siteUrl}/checkout/mp/success?csId=${cs.id}`,
            failure: `${siteUrl}/checkout/mp/failure?csId=${cs.id}`,
            pending: `${siteUrl}/checkout/mp/pending?csId=${cs.id}`,
          },
          auto_return: "approved",
          notification_url: `${siteUrl}/api/mercadopago/webhook?source_news=webhooks`,
        }),
      });
    } catch (fetchError) {
      // Error de red (timeout, DNS, etc.) — la preferencia NO se creó en MP,
      // por lo que no llegará webhook. Hay que liberar la reserva explícitamente.
      console.error("Error de red al crear preferencia en MP:", fetchError);
      await rollbackMpFailure("network_error");
      return NextResponse.json(
        { error: "Error de conexión con Mercado Pago. Intentá de nuevo." },
        { status: 502 }
      );
    }

    if (!mpRes.ok) {
      const detail = await mpRes.text().catch(() => "");
      console.error("MP STATUS:", mpRes.status);
      console.error("MP DETAIL:", detail);
      await rollbackMpFailure(`preference_error:${mpRes.status}`);
      return NextResponse.json(
        { error: "Error Mercado Pago", detail },
        { status: 502 }
      );
    }

    const pref = await mpRes.json();

    await prisma.$transaction([
      prisma.checkoutSession.update({
        where: { id: cs.id },
        data: {
          mpPreferenceId: pref?.id ?? null,
          mpStatus: "preference_created",
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: {
          mpPreferenceId: pref?.id ?? null,
          mpExternalReference: order.id,
          mpStatus: "preference_created",
        },
      }),
    ]);

    return NextResponse.json({
      csId: cs.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      preferenceId: pref.id,
      initPoint: pref.init_point,
    });
  } catch (e: unknown) {
    console.error("MP preference error:", e);
    return NextResponse.json(
      { error: "Error creando preferencia de pago" },
      { status: 500 }
    );
  }
}