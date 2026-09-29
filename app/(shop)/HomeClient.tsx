"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ProductRowSlider } from "@/components/product-row-slider";
import { ProductCard } from "@/components/product-card";
import { OfferCard } from "@/components/OfferCard";
import { CountdownTimer } from "@/components/countdown-timer";
import { HomeCombosSection } from "@/components/home-combos-section";
import {
  Star,
  Flame,
  Clock,
} from "lucide-react";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

import type { Product } from "@/lib/types";
import { StoreLocation } from "@/components/store-location";
import type { ProcessingStatus } from "@/lib/business-hours";

type ProductWithSale = Product & {
  saleEndDate?: string | Date | null;
  isOnSale?: boolean | null;
  salePrice?: number | null;
  originalPrice?: number | null;
  discountPercent?: number | null;
  vatRate?: number | null;
  category?: { vatRate?: number | null } | null;
  minPurchaseQty?: number | null;
};

/** Adapta ProductWithSale al DTO que espera ProductCard (normaliza saleEndDate a string). */
function adaptForCard(p: ProductWithSale) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    image: p.image,
    unitType: p.unitType,
    price: p.price,
    stock: p.stock,
    vatRate: p.vatRate ?? null,
    category: p.category ? { vatRate: p.category.vatRate ?? null } : null,
    netWeightGr: (p as { netWeightGr?: number | null }).netWeightGr ?? null,
    netVolumeMl: (p as { netVolumeMl?: number | null }).netVolumeMl ?? null,
    isOnSale: typeof p.isOnSale === "boolean" ? p.isOnSale : false,
    salePrice: p.salePrice ?? null,
    saleEndDate:
      p.saleEndDate instanceof Date
        ? p.saleEndDate.toISOString()
        : (p.saleEndDate as string | null | undefined) ?? null,
    discountPercent: p.discountPercent ?? null,
    measurementUnit: (p as { measurementUnit?: string | null }).measurementUnit ?? null,
    unitMultiplier: (p as { unitMultiplier?: number | null }).unitMultiplier ?? null,
  };
}

/** Adapta ProductWithSale al DTO que espera OfferCard (misma base que adaptForCard, + isFeatured). */
function adaptForOfferCard(p: ProductWithSale) {
  return {
    ...adaptForCard(p),
    isFeatured: typeof p.isFeatured === "boolean" ? p.isFeatured : false,
  };
}

type OfferEndSummary =
  | { kind: "none" }
  | { kind: "shared"; endDate: string }
  | { kind: "mixed" };

/**
 * Fecha de fin de las ofertas activas del bloque. Un único contador solo es
 * correcto si todas vencen en el mismo instante; con fechas distintas (o
 * alguna oferta sin fecha de fin) el número engañaría sobre las demás.
 */
function getOfferEndSummary(offers: ProductWithSale[]): OfferEndSummary {
  const now = Date.now();
  const endTimes = new Set<number>();
  let hasActiveWithoutEnd = false;

  for (const o of offers) {
    if (!o.isOnSale) continue;

    if (!o.saleEndDate) {
      hasActiveWithoutEnd = true;
      continue;
    }

    const t = o.saleEndDate instanceof Date ? o.saleEndDate.getTime() : new Date(o.saleEndDate).getTime();
    if (Number.isFinite(t) && t > now) endTimes.add(t);
  }

  if (endTimes.size === 0) return { kind: "none" };
  if (endTimes.size === 1 && !hasActiveWithoutEnd) {
    return { kind: "shared", endDate: new Date([...endTimes][0]).toISOString() };
  }
  return { kind: "mixed" };
}

interface HomeClientProps {
  orderStatus: ProcessingStatus;
}

export function HomeClient({ orderStatus }: HomeClientProps) {
  const [ref5, inView5] = useInView({ triggerOnce: true, threshold: 0.1 });

  const [offers, setOffers] = useState<ProductWithSale[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);

  const [bestSellers, setBestSellers] = useState<ProductWithSale[]>([]);
  const [bestSellersLoading, setBestSellersLoading] = useState(true);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const response = await fetch("/api/products?onSale=true&limit=6", { cache: "no-store" });
        if (!response.ok) throw new Error("Error al cargar ofertas");
        const data = await response.json();
        setOffers(data);
      } catch (error) {
        console.error("Error fetching offers:", error);
      } finally {
        setOffersLoading(false);
      }
    };

    const fetchBestSellers = async () => {
      try {
        const response = await fetch("/api/products/best-sellers", { cache: "no-store" });
        if (!response.ok) throw new Error("Error al cargar más vendidos");
        const data = await response.json();
        setBestSellers(data);
      } catch (error) {
        console.error("Error fetching best sellers:", error);
      } finally {
        setBestSellersLoading(false);
      }
    };

    fetchOffers();
    fetchBestSellers();
  }, []);

  const offerEnd = getOfferEndSummary(offers);

  return (
    <div className="flex flex-col">
      {(offersLoading || offers.length > 0) && (
        <section className="w-full bg-background py-6 sm:py-10">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="flex flex-col overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_top_right,rgba(228,12,24,0.35),transparent_60%),linear-gradient(135deg,#8a1014_0%,#3a1012_45%,#1a1a1a_100%)] md:flex-row">
              <div className="flex w-full flex-col justify-center gap-4 p-6 md:w-[30%] md:shrink-0 md:p-8">
                <div>
                  <div className="flex items-center gap-2">
                    <Flame className="h-7 w-7 shrink-0 text-amber-400" />
                    <h2 className="font-display text-2xl tracking-wider text-white md:text-3xl">
                      OFERTAS DE HOY
                    </h2>
                  </div>
                  <p className="mt-1 text-sm text-white/70">
                    Aprovechá precios especiales antes de que se terminen.
                  </p>
                </div>

                {offerEnd.kind === "shared" && (
                  <div className="max-w-[220px]">
                    <CountdownTimer endDate={offerEnd.endDate} />
                  </div>
                )}

                {offerEnd.kind === "mixed" && (
                  <div className="max-w-[220px]">
                    <div className="w-full rounded-md border border-red-700 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 px-3 py-2">
                      <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide text-white">
                        <Clock className="h-3 w-3" />
                        Ofertas por tiempo limitado
                      </div>
                    </div>
                  </div>
                )}

                <Link href="/ofertas" className="w-fit">
                  <Button
                    variant="outline"
                    className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    type="button"
                  >
                    Ver todas las ofertas →
                  </Button>
                </Link>
              </div>

              <div className="flex w-full items-center border-t border-white/15 p-4 md:w-auto md:flex-1 min-w-0 md:border-l md:border-t-0 md:p-6">
                {offersLoading ? (
                  <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="animate-pulse rounded-lg border bg-background p-4"
                      >
                        <div className="mb-4 aspect-square rounded-lg bg-muted" />
                        <div className="mb-2 h-6 rounded bg-muted" />
                        <div className="h-4 w-2/3 rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full">
                    <ProductRowSlider
                      items={offers}
                      renderItem={(product) => (
                        <OfferCard product={adaptForOfferCard(product)} />
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <HomeCombosSection />

      <section ref={ref5} className="w-full bg-background py-8 sm:py-16">
        <div className="container mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={inView5 ? { opacity: 1, x: 0 } : { opacity: 0, x: -24 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-6 sm:mb-12"
          >
            <div className="mb-4 flex items-center gap-2">
              <Star className="h-8 w-8 text-primary" fill="currentColor" />
              <h2 className="font-display text-4xl md:text-5xl tracking-wider">Lo Más Elegido</h2>
            </div>
            <p className="text-lg text-muted-foreground">
              Los productos que nuestros clientes llevan una y otra vez
            </p>
          </motion.div>

          {bestSellersLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-lg border bg-card p-4"
                >
                  <div className="mb-4 aspect-square rounded-lg bg-muted" />
                  <div className="mb-2 h-6 rounded bg-muted" />
                  <div className="h-4 w-2/3 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : bestSellers.length > 0 ? (
            <ProductRowSlider
              items={bestSellers}
              renderItem={(product) => (
                <ProductCard product={adaptForCard(product)} />
              )}
            />
          ) : (
            <div className="rounded-xl border bg-muted/20 py-10 text-center text-muted-foreground">
              <p className="font-medium">Aún no hay datos de ventas.</p>
            </div>
          )}
        </div>
      </section>

      <StoreLocation status={orderStatus} />
    </div>
  );
}
