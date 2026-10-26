import "server-only";

import { prisma } from "@/lib/db";
import { buildComboCheckoutLines, findActiveCombosById } from "@/lib/combos";

const MAX_ITEMS = 100;

function isSaleActive(p: { isOnSale: boolean; salePrice: number | null; saleEndDate: Date | null }) {
  if (!p.isOnSale || p.salePrice == null) return false;
  if (!p.saleEndDate) return true;
  return p.saleEndDate.getTime() > Date.now();
}

/**
 * Subtotal de productos (centavos) de un carrito con los precios de la base:
 * ofertas vigentes y combos, sin envío. Mismo cálculo de línea que
 * /api/orders y /api/checkout/talo.
 *
 * SOLO PARA MOSTRAR cotizaciones en el checkout: no valida reglas de compra ni
 * reserva stock. Al crear el pedido el checkout recalcula todo y, si se usan
 * puntos, exige que coincidan con lo que vio el cliente (expectedPoints).
 *
 * Devuelve null si el carrito no es válido (vacío, ítems inexistentes o
 * inactivos, cantidades inválidas o combos sin stock).
 */
export async function computeCartSubtotalCents(items: unknown): Promise<number | null> {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) return null;

  const productItems: { productId: string; quantity: number }[] = [];
  const comboItems: { comboId: string; quantity: number }[] = [];

  for (const raw of items) {
    if (typeof raw !== "object" || raw === null) return null;
    const productId = "productId" in raw && typeof raw.productId === "string" ? raw.productId.trim() : "";
    const comboId = "comboId" in raw && typeof raw.comboId === "string" ? raw.comboId.trim() : "";
    const quantity = "quantity" in raw ? Number(raw.quantity) : NaN;
    if (!Number.isFinite(quantity) || quantity <= 0) return null;
    if (productId && !comboId) productItems.push({ productId, quantity });
    else if (comboId && !productId) comboItems.push({ comboId, quantity });
    else return null;
  }

  const ids = Array.from(new Set(productItems.map((i) => i.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true },
    select: { id: true, price: true, salePrice: true, isOnSale: true, saleEndDate: true, unitType: true },
  });
  if (products.length !== ids.length) return null;
  const byId = new Map(products.map((p) => [p.id, p]));

  let subtotalCents = 0;
  for (const i of productItems) {
    const p = byId.get(i.productId);
    if (!p) return null;
    const priceCents = isSaleActive(p) ? Number(p.salePrice) : Number(p.price);
    const qty = p.unitType === "PER_UNIT" ? Math.round(i.quantity) : i.quantity;
    subtotalCents += Math.round(priceCents * qty);
  }

  if (comboItems.length > 0) {
    const comboById = await findActiveCombosById(
      prisma,
      Array.from(new Set(comboItems.map((i) => i.comboId)))
    );
    try {
      for (const line of buildComboCheckoutLines(comboItems, comboById)) {
        subtotalCents += line.lineCents;
      }
    } catch {
      return null;
    }
  }

  return subtotalCents;
}
