/**
 * Formatea un precio en centavos a pesos argentinos
 */
export function formatPrice(centavos: number): string {
  const pesos = (centavos ?? 0) / 100;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(pesos);
}

/**
 * Formatea cantidad según tipo de unidad
 */
export function formatQuantity(quantity: number, unitType: 'PER_KG' | 'PER_UNIT'): string {
  if (unitType === 'PER_KG') {
    return `${(quantity ?? 0).toFixed(2)} kg`;
  }
  return `${Math.floor(quantity ?? 0)} ${(quantity ?? 0) === 1 ? 'unidad' : 'unidades'}`;
}

/**
 * Obtiene el label de unidad
 */
export function getUnitLabel(unitType: 'PER_KG' | 'PER_UNIT'): string {
  return unitType === 'PER_KG' ? 'kg' : 'unidad';
}
