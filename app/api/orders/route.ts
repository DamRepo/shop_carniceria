import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendOrderConfirmationEmail, sendTransferInstructionsEmail } from "@/lib/mail/actions";
import { sendTelegramMessage, buildTelegramOrderMessage } from "@/lib/telegram";
import { rateLimit } from "@/lib/rate-limit";
import { getShippingCost, isValidShippingZone } from "@/lib/shipping";
import { generateTransferCode, formatTransferAmount } from "@/lib/transfer-code";
import { computeComboPricing, sumComboComponentsCents } from "@/lib/combos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type IncomingItem = {
  productId?: string;
  comboId?: string;
  quantity: number;
};

type IncomingProductItem = { productId: string; quantity: number };
type IncomingComboItem = { comboId: string; quantity: number };

function splitIncomingItems(items: IncomingItem[]) {
  const productItems: IncomingProductItem[] = [];
  const comboItems: IncomingComboItem[] = [];

  for (const raw of items) {
    const quantity = safeNumber(raw?.quantity);
    const comboId = normalizeString(raw?.comboId);
    const productId = normalizeString(raw?.productId);

    if (comboId && productId) {
      throw new HttpError(400, "Un ítem no puede ser producto y combo a la vez");
    }
    if (comboId) {
      comboItems.push({ comboId, quantity });
    } else if (productId) {
      productItems.push({ productId, quantity });
    } else {
      throw new HttpError(400, "Ítem sin productId ni comboId");
    }
  }

  return { productItems, comboItems };
}

function validateComboQuantity(name: string, qty: number) {
  if (!Number.isFinite(qty) || qty <= 0 || !nearlyInteger(qty)) {
    throw new HttpError(400, `Cantidad inválida para el combo ${name}`);
  }
}

function safeNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function computeStockDecrement(
  unitType: "PER_UNIT" | "PER_KG",
  qty: number
): number {
  if (unitType === "PER_UNIT") {
    return Math.round(qty);
  }

  const grams = Math.round(qty * 1000);

  // 🚨 VALIDACIÓN REAL (NO FORZAR A 1)
  if (grams <= 0) {
    throw new HttpError(400, "Cantidad inválida en gramos");
  }

  return grams;
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isSaleActive(p: any) {
  if (!p.isOnSale || p.salePrice == null) return false;
  if (!p.saleEndDate) return true;
  return p.saleEndDate.getTime() > Date.now();
}

function getEffectivePrice(p: any) {
  return isSaleActive(p) ? Number(p.salePrice) : Number(p.price);
}

function nearlyInteger(n: number) {
  return Math.abs(n - Math.round(n)) < 1e-9;
}

function validateProductQuantity(p: any, qty: number) {
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new HttpError(400, `Cantidad inválida para ${p.name}`);
  }

  if (p.unitType === "PER_UNIT" && !nearlyInteger(qty)) {
    throw new HttpError(400, `${p.name} solo permite unidades enteras`);
  }
  if (p.unitType === "PER_KG") {
  if (qty < 0.01) {
    throw new HttpError(400, `${p.name} mínimo 10 gramos`);
  }
}
}

export async function POST(request: Request) {
  try {
    // Rate limiting: 5 órdenes / 10 min por IP (evita spam y descuentos de stock falsos)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const rl = rateLimit(`orders:${ip}`, 5, 10 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Esperá unos minutos e intentá de nuevo." },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions).catch(() => null);
    const sessionUserId = (session?.user as any)?.id as string | undefined;

    let safeUserId: string | null = null;

    if (sessionUserId) {
      const exists = await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: { id: true },
      });

      if (exists) safeUserId = sessionUserId;
    }

    const body = await request.json().catch(() => null);

    // Require email for guest orders (no userId means no account to contact)
    if (!safeUserId) {
      const guestEmail = body?.email?.trim?.();
      if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
        return NextResponse.json(
          { error: "El email es requerido para continuar como invitado" },
          { status: 400 }
        );
      }
    }

    const customerName = normalizeString(body?.customerName);
    const phone = normalizeString(body?.phone);
    const email = normalizeString(body?.email)?.toLowerCase();
    const deliveryMethod = body?.deliveryMethod;

    const rawPaymentMethod = body?.paymentMethod;
    const paymentMethod: "CASH" | "BANK_TRANSFER" =
      rawPaymentMethod === "BANK_TRANSFER" ? "BANK_TRANSFER" : "CASH";

    if (deliveryMethod !== "PICKUP" && deliveryMethod !== "DELIVERY") {
      throw new HttpError(400, "Método de entrega inválido");
    }

    const deliveryZoneRaw = normalizeString(body?.deliveryZone);
    const address = normalizeString(body?.address);
    const addressDetails = normalizeString(body?.addressDetails);
    const notes = normalizeString(body?.notes);

    const pickupDateRaw = normalizeString(body?.pickupDate);
    const pickupTimeSlot = normalizeString(body?.pickupTimeSlot);
    const pickupNotes = normalizeString(body?.pickupNotes);

    const items = body?.items as IncomingItem[] | undefined;

    // VALIDACIONES
    if (!customerName || !phone || !items || items.length === 0) {
      throw new HttpError(400, "Datos incompletos");
    }

    if (items.length > 100) {
      throw new HttpError(400, "Demasiados productos en la orden");
    }

    if (deliveryMethod === "DELIVERY") {
      if (!isValidShippingZone(deliveryZoneRaw)) {
        throw new HttpError(400, "Zona de envío inválida");
      }
      if (!address) {
        throw new HttpError(400, "Falta dirección de envío");
      }
    }

    if (deliveryMethod === "PICKUP") {
      if (!pickupDateRaw || !pickupTimeSlot) {
        throw new HttpError(400, "Falta fecha y horario de retiro");
      }
    }

    let pickupDate: Date | undefined = undefined;

    if (deliveryMethod === "PICKUP") {
      pickupDate = new Date(`${pickupDateRaw}T12:00:00`);
    }

    const { productItems, comboItems } = splitIncomingItems(items);

    const ids = Array.from(new Set(productItems.map((i) => i.productId)));
    const comboIds = Array.from(new Set(comboItems.map((i) => i.comboId)));

    const products = await prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
    });

    const combos = await prisma.combo.findMany({
      where: { id: { in: comboIds }, isActive: true },
      select: {
        id: true,
        name: true,
        stock: true,
        priceType: true,
        priceValue: true,
        items: { select: { quantity: true, product: { select: { price: true } } } },
      },
    });

    type ProductRow = (typeof products)[number];
    type ComboRow = (typeof combos)[number];
    const byId = new Map<string, ProductRow>(products.map((p) => [p.id, p]));
    const comboById = new Map<string, ComboRow>(combos.map((c) => [c.id, c]));

    const existingIds = new Set(products.map((p) => p.id));
    const missingIds = ids.filter((id) => !existingIds.has(id));
    const missingComboIds = comboIds.filter((id) => !comboById.has(id));

    console.log(`[orders] Buscando: [${ids.join(", ")}] combos: [${comboIds.join(", ")}]`);
    console.log(`[orders] Encontrados: [${[...existingIds].join(", ")}] combos: [${[...comboById.keys()].join(", ")}]`);

    if (missingIds.length > 0 || missingComboIds.length > 0) {
      console.error(
        `[orders] ❌ No encontrados/inactivos — productos: [${missingIds.join(", ")}] combos: [${missingComboIds.join(", ")}]`
      );
      return NextResponse.json(
        {
          error: "Algunos productos ya no están disponibles",
          missingProducts: missingIds,
          missingCombos: missingComboIds,
          availableProducts: [...existingIds],
        },
        { status: 400 }
      );
    }

    let subtotalCents = 0;

    const productOrderItems = productItems.map((i) => {
      const p = byId.get(i.productId)!;
      validateProductQuantity(p, i.quantity);

      const priceCents = getEffectivePrice(p);

      let lineTotalCents = 0;

      if (p.unitType === "PER_KG") {
        // Multiplicar directamente en kg evita el error acumulado de la conversión a gramos
        lineTotalCents = Math.round(priceCents * i.quantity);
      } else {
        lineTotalCents = Math.round(priceCents * i.quantity);
      }

      subtotalCents += lineTotalCents;

      return {
        productId: p.id,
        // PER_UNIT siempre entero — evitar que un float como 2.0000000001 se guarde en DB
        quantity: p.unitType === "PER_UNIT" ? Math.round(i.quantity) : i.quantity,
        unitPrice: priceCents,
        lineTotal: lineTotalCents,
        itemNameSnapshot: p.name,
      };
    });

    const comboOrderItems = comboItems.map((i) => {
      const c = comboById.get(i.comboId)!;
      validateComboQuantity(c.name, i.quantity);

      const qty = Math.round(i.quantity);
      const { finalPriceCents } = computeComboPricing({
        priceType: c.priceType,
        priceValue: c.priceValue,
        componentsTotalCents: sumComboComponentsCents(c.items),
      });
      const lineTotalCents = finalPriceCents * qty;

      subtotalCents += lineTotalCents;

      return {
        comboId: c.id,
        quantity: qty,
        unitPrice: finalPriceCents,
        lineTotal: lineTotalCents,
        itemNameSnapshot: c.name,
      };
    });

    const orderItems = [...productOrderItems, ...comboOrderItems];

    const deliveryCostCents =
      deliveryMethod === "DELIVERY" && isValidShippingZone(deliveryZoneRaw)
        ? getShippingCost(deliveryZoneRaw)
        : 0;

    const totalCents = subtotalCents + deliveryCostCents;

    // 🔥 FIX CLAVE: AGRUPAR STOCK
    const decByProductId = new Map<string, number>();

    for (const it of productItems) {
      const p = byId.get(it.productId)!;
      const dec = computeStockDecrement(p.unitType, it.quantity);

      decByProductId.set(
        it.productId,
        (decByProductId.get(it.productId) ?? 0) + dec
      );
    }

    const decByComboId = new Map<string, number>();

    for (const it of comboOrderItems) {
      decByComboId.set(
        it.comboId,
        (decByComboId.get(it.comboId) ?? 0) + it.quantity
      );
    }

    // Pre-chequeo no atómico para devolver un error claro antes de abrir la
    // transacción; el guard real es el updateMany condicional de abajo.
    for (const [comboId, dec] of decByComboId.entries()) {
      const c = comboById.get(comboId)!;
      if (c.stock < dec) {
        throw new HttpError(400, `Stock insuficiente para el combo ${c.name}`);
      }
    }

    const created = await prisma.$transaction(async (tx: any) => {
      for (const [productId, dec] of decByProductId.entries()) {
        const p = byId.get(productId)!;

        const updated = await tx.product.updateMany({
          where: {
            id: productId,
            stock: { gte: dec },
          },
          data: {
            stock: { decrement: dec },
          },
        });

        if (updated.count === 0) {
          throw new HttpError(400, `Stock insuficiente para ${p.name}`);
        }
      }

      for (const [comboId, dec] of decByComboId.entries()) {
        const c = comboById.get(comboId)!;

        const updated = await tx.combo.updateMany({
          where: {
            id: comboId,
            isActive: true,
            stock: { gte: dec },
          },
          data: {
            stock: { decrement: dec },
          },
        });

        if (updated.count === 0) {
          throw new HttpError(400, `Stock insuficiente para el combo ${c.name}`);
        }
      }

      const transferCode =
        paymentMethod === "BANK_TRANSFER"
          ? await generateTransferCode(tx)
          : null;

      return await tx.order.create({
        data: {
          userId: safeUserId,
          customerName,
          phone,
          email,
          deliveryMethod,
          address,
          addressDetails,
          notes,
          pickupDate,
          pickupTimeSlot,
          pickupNotes,
          paymentMethod,
          paymentStatus: "PENDING",
          status: paymentMethod === "BANK_TRANSFER" ? "PENDING_PAYMENT" : "PENDING",
          subtotal: subtotalCents,
          deliveryCost: deliveryCostCents,
          total: totalCents,
          items: { create: orderItems },
          ...(transferCode && {
            transferCode,
            transferStatus: "PENDING_REVIEW",
          }),
        },
      });
    });

    // EMAIL (no bloquea)
    if (email) {
      if (paymentMethod === "BANK_TRANSFER" && created.transferCode) {
        sendTransferInstructionsEmail({
          to: email,
          customerName,
          transferCode: created.transferCode,
          totalText: formatTransferAmount(totalCents),
        }).catch((e) => console.error("Email transferencia falló:", e));
      } else {
        sendOrderConfirmationEmail({
          to: email,
          customerName,
          orderId: created.orderNumber,
          items: orderItems.map((it) => ({
            name: it.itemNameSnapshot,
            quantity: it.quantity,
            unitPrice: it.unitPrice / 100,
          })),
          totalText: `$${(totalCents / 100).toFixed(2)}`,
        }).catch((e) => console.log("Email falló:", e));
      }
    }

    // TELEGRAM (no bloquea)
    sendTelegramMessage({
      text: buildTelegramOrderMessage({
        orderNumber: created.orderNumber,
        customerName,
        phone,
        email,
        deliveryMethod: deliveryMethod as "PICKUP" | "DELIVERY",
        paymentMethod,
        address,
        addressDetails,
        pickupDate: created.pickupDate,
        pickupTimeSlot,
        subtotalCents,
        deliveryCostCents,
        totalCents,
        items: orderItems.map((it) => ({
          name: it.itemNameSnapshot,
          quantity: it.quantity,
          unitType:
            "productId" in it
              ? ((byId.get(it.productId)?.unitType ?? "PER_UNIT") as "PER_KG" | "PER_UNIT")
              : "PER_UNIT",
          lineTotalCents: it.lineTotal,
        })),
      }),
    }).catch((e) => console.error("Telegram falló:", e));

    return NextResponse.json(
      {
        orderId: created.id,
        orderNumber: created.orderNumber,
        transferCode: created.transferCode ?? null,
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    console.error("ORDER ERROR:", e);

    if (e instanceof HttpError) {
      return NextResponse.json(
        { error: e.message },
        { status: e.status }
      );
    }

    return NextResponse.json(
      { error: "Error creando orden" },
      { status: 500 }
    );
  }
}