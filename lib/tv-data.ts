import "server-only";
import { prisma } from "@/lib/db";
import { computeComboPricing, sumComboComponentsCents } from "@/lib/combos";
import { getStoreHours } from "@/lib/business-hours-server";
import type { StoreHours } from "@/lib/business-hours";
import { getEffectivePrice, getOfferDiscountPercent, getPriceInfo, hasActiveOffer } from "@/lib/offers";

/**
 * Datos de la pantalla del local (/tv). Solo campos públicos: lo mismo que ya
 * muestran /ofertas, /destacados y la sección de combos del home. Montos en centavos.
 */

/** Producto en la tele (ofertas y destacados). */
export type TvProduct = {
  id: string;
  name: string;
  image: string | null;
  price: number;
  oldPrice: number | null;
  discountPercent: number | null;
};

export type TvCombo = {
  id: string;
  name: string;
  images: string[];
  price: number;
  oldPrice: number | null;
  discountPercent: number | null;
};

export type TvData = {
  offers: TvProduct[];
  featured: TvProduct[];
  combos: TvCombo[];
  hours: StoreHours;
};

// Tope para que el bucle no se haga eterno si se cargan muchas ofertas.
const MAX_OFFERS = 24;
const MAX_FEATURED = 24;
const MAX_COMBOS = 10;

/** La pantalla solo existe con TV_ENABLED="true" (se lee en cada request, no en el build). */
export function isTvEnabled(): boolean {
  return process.env.TV_ENABLED === "true";
}

/**
 * Ofertas: misma consulta que GET /api/products?onSale=true y mismo filtro que
 * la página /ofertas (hasActiveOffer). En la tele se omiten las que no tienen stock.
 */
const PRODUCT_SELECT = {
  id: true,
  name: true,
  image: true,
  unitType: true,
  price: true,
  stock: true,
  isOnSale: true,
  salePrice: true,
  saleEndDate: true,
  discountPercent: true,
} as const;

type ProductRow = {
  id: string;
  name: string;
  image: string | null;
  unitType: "PER_KG" | "PER_UNIT";
  price: number;
  isOnSale: boolean;
  salePrice: number | null;
  saleEndDate: Date | null;
  discountPercent: number | null;
};

/** Precio vigente (con la oferta si está activa), precio anterior y % como en la web. */
function toTvProduct(p: ProductRow): TvProduct {
  const { hasSale } = getPriceInfo(p);
  return {
    id: p.id,
    name: p.name,
    image: p.image,
    price: getEffectivePrice(p),
    oldPrice: hasSale ? p.price : null,
    discountPercent: getOfferDiscountPercent(p),
  };
}

async function getTvOffers(): Promise<TvProduct[]> {
  const now = new Date();
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      isOnSale: true,
      OR: [{ saleEndDate: null }, { saleEndDate: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    select: PRODUCT_SELECT,
  });

  return products
    .filter((p) => hasActiveOffer(p) && p.stock > 0)
    .slice(0, MAX_OFFERS)
    .map(toTvProduct);
}

/**
 * Destacados: los marcados como "Destacado" en el admin (isFeatured), misma
 * consulta que GET /api/products?featured=true (home y /destacados). Sin los agotados.
 */
async function getTvFeatured(): Promise<TvProduct[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    orderBy: { createdAt: "desc" },
    select: PRODUCT_SELECT,
  });

  return products
    .filter((p) => p.stock > 0)
    .slice(0, MAX_FEATURED)
    .map(toTvProduct);
}

/** Combos activos: misma consulta y mismo cálculo de precio que GET /api/combos. Sin los agotados. */
async function getTvCombos(): Promise<TvCombo[]> {
  const combos = await prisma.combo.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      stock: true,
      priceType: true,
      priceValue: true,
      items: {
        select: { quantity: true, product: { select: { image: true, price: true } } },
      },
    },
  });

  return combos
    .filter((c) => c.stock > 0)
    .slice(0, MAX_COMBOS)
    .map((c) => {
      const componentsTotalCents = sumComboComponentsCents(c.items);
      const { finalPriceCents, savingsCents } = computeComboPricing({
        priceType: c.priceType,
        priceValue: c.priceValue,
        componentsTotalCents,
      });
      const hasSavings = savingsCents > 0 && componentsTotalCents > 0;
      const productImages = c.items
        .map((i) => i.product.image)
        .filter((src): src is string => typeof src === "string" && src.length > 0);

      return {
        id: c.id,
        name: c.name,
        images: c.imageUrl ? [c.imageUrl] : productImages.slice(0, 2),
        price: finalPriceCents,
        oldPrice: hasSavings ? componentsTotalCents : null,
        discountPercent: hasSavings ? Math.round((savingsCents / componentsTotalCents) * 100) : null,
      };
    });
}

export async function getTvData(): Promise<TvData> {
  const [offers, featured, combos, hours] = await Promise.all([
    getTvOffers(),
    getTvFeatured(),
    getTvCombos(),
    getStoreHours(),
  ]);
  return { offers, featured, combos, hours };
}
