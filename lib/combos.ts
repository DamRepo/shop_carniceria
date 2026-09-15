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
