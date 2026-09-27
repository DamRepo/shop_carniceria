import type { Prisma } from "@prisma/client";

export type ComboPriceType = "FIXED" | "PERCENTAGE_DISCOUNT";

export const COMBO_MIN_ITEMS = 2;
export const COMBO_MAX_ITEMS = 5;

interface ComboPricingInput {
  priceType: ComboPriceType;
  /** FIXED: precio final del combo en centavos. PERCENTAGE_DISCOUNT: porcentaje de descuento (0-100). */
  priceValue: number;
  /** Suma de (precio actual del producto * cantidad) de todos los ComboItem, en centavos. */
  componentsTotalCents: number;
}

interface ComboPricingResult {
  /** Precio final que paga el cliente por el combo, en centavos. */
  finalPriceCents: number;
  /** Cuánto ahorra vs. comprar los productos por separado, en centavos (nunca negativo). */
  savingsCents: number;
}

/**
 * Calcula el precio final y el ahorro de un combo a partir del precio actual
 * de sus productos componentes. Usado tanto por la API pública (GET /api/combos)
 * como por el preview en vivo del admin, para no duplicar la lógica.
 */
export function computeComboPricing({
  priceType,
  priceValue,
  componentsTotalCents,
}: ComboPricingInput): ComboPricingResult {
  const total = Number.isFinite(componentsTotalCents)
    ? Math.max(0, Math.round(componentsTotalCents))
    : 0;

  let finalPriceCents: number;

  if (priceType === "PERCENTAGE_DISCOUNT") {
    const pct = Number.isFinite(priceValue)
      ? Math.min(100, Math.max(0, priceValue))
      : 0;
    finalPriceCents = Math.round(total * (1 - pct / 100));
  } else {
    finalPriceCents = Number.isFinite(priceValue) ? Math.max(0, Math.round(priceValue)) : 0;
  }

  const savingsCents = Math.max(0, total - finalPriceCents);

  return { finalPriceCents, savingsCents };
}

/** Suma el precio actual de cada producto componente multiplicado por su cantidad en el combo. */
export function sumComboComponentsCents(
  items: { quantity: number; product: { price: number } }[]
): number {
  return items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
}

/* =========================
   Checkout: búsqueda, reserva y stock de combos.
   Solo `import type` de Prisma: este archivo también lo importa el admin en el
   cliente (CombosAdminClient), así que las funciones reciben el cliente/tx.
========================= */

type ComboDb = Prisma.TransactionClient;

export type ComboForCheckout = {
  id: string;
  name: string;
  stock: number;
  reservedStock: number;
  priceType: ComboPriceType;
  priceValue: number;
  items: { quantity: number; product: { price: number } }[];
};

export type ComboReservationItem = {
  comboId: string;
  reserveQty: number;
};

export type ComboCheckoutLine = {
  comboId: string;
  name: string;
  units: number;
  unitPriceCents: number;
  lineCents: number;
};

function nearlyInteger(n: number) {
  return Math.abs(n - Math.round(n)) < 1e-9;
}

/** Unidades de combo a reservar/descontar a partir de la cantidad guardada en el snapshot. */
export function getComboReserveQty(qty: number) {
  const units = Math.round(Number(qty ?? 0));
  if (units <= 0) {
    throw new Error("Cantidad inválida de combo");
  }
  return units;
}

/** Combos activos pedidos, indexados por id. Los inactivos o inexistentes no aparecen. */
export async function findActiveCombosById(
  db: ComboDb,
  comboIds: string[]
): Promise<Map<string, ComboForCheckout>> {
  const combos = await db.combo.findMany({
    where: { id: { in: comboIds }, isActive: true },
    select: {
      id: true,
      name: true,
      stock: true,
      reservedStock: true,
      priceType: true,
      priceValue: true,
      items: { select: { quantity: true, product: { select: { price: true } } } },
    },
  });
  return new Map(combos.map((c) => [c.id, c]));
}

/**
 * Valida cantidad (entera y positiva) y stock disponible (stock - reservedStock)
 * de cada combo pedido, y calcula su precio con computeComboPricing.
 * Tira Error si algo no cierra; no escribe nada.
 */
export function buildComboCheckoutLines(
  items: Array<{ comboId: string; quantity: number }>,
  comboById: Map<string, ComboForCheckout>
): ComboCheckoutLine[] {
  return items.map((i) => {
    const c = comboById.get(i.comboId);
    if (!c) throw new Error(`Combo no encontrado: ${i.comboId}`);

    const qty = Number(i.quantity);
    if (!Number.isFinite(qty) || qty <= 0 || !nearlyInteger(qty)) {
      throw new Error(`Cantidad inválida para el combo ${c.name}`);
    }
    const units = Math.round(qty);

    const { finalPriceCents } = computeComboPricing({
      priceType: c.priceType,
      priceValue: c.priceValue,
      componentsTotalCents: sumComboComponentsCents(c.items),
    });

    const availableNow = Math.max(0, (c.stock ?? 0) - (c.reservedStock ?? 0));
    if (availableNow < units) {
      throw new Error(`Stock insuficiente para el combo ${c.name}`);
    }

    return {
      comboId: c.id,
      name: c.name,
      units,
      unitPriceCents: finalPriceCents,
      lineCents: finalPriceCents * units,
    };
  });
}

/**
 * Reserva Combo.reservedStock dentro de la transacción, con optimistic locking
 * (updateMany condicionado a stock/reservedStock leídos). Tira Error si no alcanza.
 */
export async function reserveComboStock(tx: ComboDb, items: ComboReservationItem[]) {
  for (const r of items) {
    const combo = await tx.combo.findUnique({
      where: { id: r.comboId },
      select: { id: true, name: true, isActive: true, stock: true, reservedStock: true },
    });

    if (!combo || !combo.isActive) {
      throw new Error(`Combo no encontrado: ${r.comboId}`);
    }

    const available = Math.max(0, combo.stock - combo.reservedStock);
    if (available < r.reserveQty) {
      throw new Error(`Stock insuficiente para el combo ${combo.name}`);
    }

    const updated = await tx.combo.updateMany({
      where: {
        id: r.comboId,
        stock: combo.stock,
        reservedStock: combo.reservedStock,
      },
      data: {
        reservedStock: { increment: r.reserveQty },
      },
    });

    if (updated.count === 0) {
      throw new Error(`No se pudo reservar stock para el combo ${combo.name}`);
    }
  }
}

/** Devuelve una reserva de combo. El guard `gte` evita dejar reservedStock negativo. */
export async function releaseComboReservation(tx: ComboDb, comboId: string, qty: number) {
  await tx.combo.updateMany({
    where: { id: comboId, reservedStock: { gte: qty } },
    data: { reservedStock: { decrement: qty } },
  });
}

/**
 * Pago aprobado: pasa la reserva a venta (descuenta stock y reservedStock).
 * Tira RESERVE_CONFIRM_FAILED:combo:<id>:<qty> si la reserva no está.
 */
export async function confirmComboSale(tx: ComboDb, comboId: string, qty: number) {
  const updated = await tx.combo.updateMany({
    where: { id: comboId, reservedStock: { gte: qty } },
    data: {
      stock: { decrement: qty },
      reservedStock: { decrement: qty },
    },
  });
  if (updated.count === 0) {
    throw new Error(`RESERVE_CONFIRM_FAILED:combo:${comboId}:${qty}`);
  }
}
