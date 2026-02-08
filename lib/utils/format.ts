/**
 * Formatea un precio en centavos a pesos argentinos
 */
export function formatPrice(pesos: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(pesos ?? 0);
}

export type UnitType = "PER_KG" | "PER_UNIT";

export function formatQuantity(quantity: number, unitType: UnitType): string {
  const q = quantity ?? 0;

  if (unitType === "PER_KG") {
    return `${q.toFixed(2)} kg`;
  }

  const units = Math.floor(q);
  return `${units} ${units === 1 ? "unidad" : "unidades"}`;
}

export function getUnitLabel(unitType: UnitType): string {
  return unitType === "PER_KG" ? "kg" : "unidad";
}
