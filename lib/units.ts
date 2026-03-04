import type { UnitType } from "@prisma/client";

export const GRAMS_PER_KG = 1000;

/**
 * Convierte una cantidad “humana” a stock entero
 * - PER_KG: kg → gramos
 * - PER_UNIT: unidades → unidades
 */
export function toStockUnits(quantity: number, unitType: UnitType): number {
  const q = Number(quantity ?? 0);

  if (!Number.isFinite(q) || q <= 0) return 0;

  if (unitType === "PER_KG") {
    return Math.round(q * GRAMS_PER_KG); // 0.5 kg → 500 g
  }

  return Math.round(q); // unidades
}

/**
 * Convierte stock entero a cantidad “humana”
 * - PER_KG: gramos → kg
 * - PER_UNIT: unidades → unidades
 */
export function fromStockUnits(stock: number, unitType: UnitType): number {
  const s = Number(stock ?? 0);

  if (!Number.isFinite(s) || s <= 0) return 0;

  if (unitType === "PER_KG") {
    return s / GRAMS_PER_KG; // 1500 g → 1.5 kg
  }

  return s;
}
