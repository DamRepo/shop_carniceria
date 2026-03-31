const UNIT_LABELS: Record<string, string> = {
  kg: "Kg",
  g: "Kg",
  l: "L",
  ml: "L",
  m: "m",
  m2: "m²",
  un: "un",
}

/** Normaliza la unidad y el multiplicador a la unidad base (kg, l, m, m2, un) */
function normalize(
  unit: string,
  multiplier: number
): { baseUnit: string; baseMultiplier: number } {
  switch (unit) {
    case "g":
      return { baseUnit: "kg", baseMultiplier: multiplier / 1000 }
    case "ml":
      return { baseUnit: "l", baseMultiplier: multiplier / 1000 }
    default:
      return { baseUnit: unit, baseMultiplier: multiplier }
  }
}

/** Formatea centavos como precio ARS con punto para miles: 9050 → "9.050" */
function formatARS(centavos: number): string {
  const pesos = Math.round(centavos / 100)
  return pesos.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export interface UnitPriceResult {
  label: string
  pricePerUnit: number // en centavos
}

/**
 * Calcula el precio de referencia por unidad de medida al estilo Supermercados DIA.
 *
 * @param sellingPrice  Precio de venta en centavos (ya descontado si aplica)
 * @param measurementUnit  "kg" | "g" | "l" | "ml" | "m" | "m2" | "un"
 * @param unitMultiplier   Cantidad del producto en esa unidad (ej: 500 para 500g)
 * @param listPrice  Precio de lista en centavos (opcional, no se usa en el label actual)
 * @returns UnitPriceResult o null si no aplica
 */
export function computeUnitPrice(
  sellingPrice: number,
  measurementUnit: string,
  unitMultiplier: number,
  _listPrice?: number
): UnitPriceResult | null {
  if (!unitMultiplier || unitMultiplier <= 0) return null
  if (measurementUnit === "un" && unitMultiplier === 1) return null

  const { baseUnit, baseMultiplier } = normalize(measurementUnit, unitMultiplier)

  if (baseMultiplier <= 0) return null

  const pricePerUnit = sellingPrice / baseMultiplier
  const unitLabel = UNIT_LABELS[baseUnit] ?? baseUnit

  const label = `Precio por 1 ${unitLabel} $ ${formatARS(pricePerUnit)}`

  return { label, pricePerUnit }
}
