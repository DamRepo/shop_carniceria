// lib/utils-format.ts

export function formatPrice(cents: number | null | undefined): string {
  // Convertimos de centavos a pesos
  const valueInPesos = Math.round((cents ?? 0) / 100);

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valueInPesos);
}

export type UnitType = "PER_KG" | "PER_UNIT";

/* =========================================================
   PRECIO COMPARABLE (por kg / por litro)
========================================================= */

/**
 * Calcula precio comparable:
 * - Si PER_UNIT y tiene netWeightGr -> devuelve $/kg
 * - Si PER_UNIT y tiene netVolumeMl -> devuelve $/L
 * - Si PER_KG -> null (ya es por kg)
 * - Si faltan datos -> null
 *
 * priceCents debe ser el precio FINAL en centavos (por ejemplo con oferta aplicada)
 */
export function getComparableUnitPrice(params: {
  priceCents: number | null | undefined;
  unitType: UnitType;
  netWeightGr?: number | null;
  netVolumeMl?: number | null;
}): { unit: "kg" | "L"; cents: number } | null {
  const priceCents = Number(params.priceCents ?? 0);
  if (!Number.isFinite(priceCents) || priceCents <= 0) return null;

  // Carnicería: el precio principal ya es por kg, no repetimos.
  if (params.unitType === "PER_KG") return null;

  const grams = Number(params.netWeightGr ?? 0);
  if (Number.isFinite(grams) && grams > 0) {
    // $/kg = (precio * 1000g) / gramos
    const centsPerKg = Math.round((priceCents * 1000) / grams);
    return { unit: "kg", cents: centsPerKg };
  }

  const ml = Number(params.netVolumeMl ?? 0);
  if (Number.isFinite(ml) && ml > 0) {
    // $/L = (precio * 1000ml) / ml
    const centsPerL = Math.round((priceCents * 1000) / ml);
    return { unit: "L", cents: centsPerL };
  }

  return null;
}

/* =========================================================
   IVA
========================================================= */

/**
 * Calcula precio sin impuestos nacionales
 * grossCents = precio final (centavos)
 * vatRate = 0.21 | 0.105
 */
export function netFromGrossCents(grossCents: number, vatRate: number): number {
  const gross = Number(grossCents ?? 0);
  const rate = Number(vatRate ?? 0.21);

  if (!Number.isFinite(gross) || gross <= 0) return 0;
  if (!Number.isFinite(rate) || rate < 0) return Math.round(gross);

  return Math.round(gross / (1 + rate));
}

/**
 * Determina IVA efectivo (producto pisa categoría).
 * Default: 21%
 */
export function getVatRate(product: {
  vatRate?: number | null;
  category?: { vatRate?: number | null } | null;
}): number {
  return product.vatRate ?? product.category?.vatRate ?? 0.21;
}

/* =========================================================
   CANTIDADES POR KG
========================================================= */

/**
 * Define paso dinámico:
 * < 1kg  -> 0.1 (100g)
 * >= 1kg -> 0.5
 */
export function getKgStep(quantity: number): number {
  const q = Number(quantity);
  const safe = Number.isFinite(q) ? q : 1;
  return safe < 1 ? 0.1 : 0.5;
}

/**
 * Sumar cantidad en KG con regla dinámica
 * (evita basura flotante)
 */
export function stepUpKg(quantity: number): number {
  const q = Number(quantity);
  const safe = Number.isFinite(q) ? q : 1;

  const step = getKgStep(safe);
  const next = safe + step;

  return +next.toFixed(3);
}

/**
 * Restar cantidad en KG con regla dinámica.
 */
export function stepDownKg(quantity: number): number {
  const q = Number(quantity);
  const safe = Number.isFinite(q) ? q : 1;

  if (safe <= 1) {
    const next = safe - 0.1;
    return Math.max(0.1, +next.toFixed(3));
  }

  const next = safe - 0.5;
  return +(next < 1 ? 1 : next).toFixed(3);
}

/**
 * Formatea cantidad según tipo de unidad:
 * - PER_KG: <1kg -> gramos (0.2 => "200 g"), >=1kg -> "1,5 kg"
 * - PER_UNIT: "1 unidad" / "2 unidades"
 */
export function formatQuantity(
  quantity: number | null | undefined,
  unitType: UnitType
): string {
  const q = Number(quantity ?? 0);
  const safe = Number.isFinite(q) ? q : 0;

  if (unitType === "PER_KG") {
    if (safe < 1) {
      const grams = Math.round(safe * 1000);
      return `${grams} g`;
    }

    const formatted = new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(safe);

    return `${formatted} kg`;
  }

  const units = Math.max(1, Math.floor(safe || 1));
  return `${units} ${units === 1 ? "unidad" : "unidades"}`;
}

/**
 * Devuelve etiqueta simple de unidad.
 */
export function getUnitLabel(unitType: UnitType): string {
  return unitType === "PER_KG" ? "kg" : "unidad";
}