/**
 * Reglas de "oferta vigente" y precio de oferta. Las usan la página /ofertas
 * (cliente) y la pantalla del local /tv (servidor), así las dos muestran lo mismo.
 * Sin dependencias de servidor: este archivo se importa desde el navegador.
 */

export type OfferProductFields = {
  price: number;
  unitType?: "PER_KG" | "PER_UNIT";
  isOnSale?: boolean | null;
  salePrice?: number | null;
  saleEndDate?: string | Date | null;
  discountPercent?: number | null;
};

export function hasActiveOffer(product: OfferProductFields) {
  if (!product.isOnSale) return false;
  if (!product.saleEndDate) return true;

  const t = new Date(product.saleEndDate).getTime();
  if (!Number.isFinite(t)) return true;

  return t > Date.now();
}

export function getEffectivePrice(product: OfferProductFields) {
  const offerActive = hasActiveOffer(product);

  if (offerActive && product.salePrice != null && product.salePrice > 0) {
    return product.salePrice;
  }

  return product.price;
}

export function getPriceInfo(product: OfferProductFields) {
  const hasSale =
    hasActiveOffer(product) &&
    typeof product.salePrice === "number" &&
    product.salePrice > 0 &&
    product.salePrice < product.price;

  return {
    hasSale,
    originalPrice: product.price,
    salePrice: hasSale ? product.salePrice : null,
    unitLabel: (product.unitType ?? "PER_KG") === "PER_KG" ? "kg" : "unidad",
  };
}

export function calcDiscountPercent(original: number, sale: number) {
  if (!Number.isFinite(original) || !Number.isFinite(sale)) return null;
  if (original <= 0 || sale <= 0 || sale >= original) return null;
  return Math.round(((original - sale) / original) * 100);
}

/** % de descuento que muestra la tarjeta: el cargado en el producto o, si no hay, el calculado. */
export function getOfferDiscountPercent(product: OfferProductFields): number | null {
  const { hasSale, originalPrice, salePrice } = getPriceInfo(product);
  if (!hasSale || typeof salePrice !== "number") return null;
  return product.discountPercent ?? calcDiscountPercent(originalPrice, salePrice);
}
