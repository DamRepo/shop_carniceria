// Conversión de cantidades de OrderItem (unidades enteras o kg decimales)
// a la unidad en la que se guardan Product.stock / Product.reservedStock
// (unidades enteras o gramos enteros para PER_KG).
//
// Misma lógica que ya vive duplicada en getReserveQty (mercadopago/preference,
// mercadopago/webhook, checkout/talo, talo-payment-processor) y en
// computeStockIncrement/computeStockDecrement (admin/transfers/[id]/reject,
// api/orders). Se centraliza acá para nuevos consumidores; los archivos
// existentes de Mercado Pago y Talo Pay no se tocan en este cambio.

export type StockUnitType = "PER_UNIT" | "PER_KG";

export function toStockQty(unitType: StockUnitType, qty: number): number {
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
