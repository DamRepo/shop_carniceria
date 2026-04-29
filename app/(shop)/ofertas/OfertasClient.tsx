"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Tag, Beef, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CountdownTimer } from "@/components/countdown-timer";

import {
  formatPrice,
  getVatRate,
  netFromGrossCents,
} from "@/lib/utils-format";
import { computeUnitPrice } from "@/lib/unitPrice";

type UnitType = "PER_KG" | "PER_UNIT";

type CategoryDTO = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  vatRate?: number | null;
};

type ProductWithCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;

  unitType?: UnitType;
  price: number;
  stock: number;

  vatRate?: number | null;
  category?: CategoryDTO | null;

  isActive?: boolean;
  isFeatured?: boolean;

  netWeightGr?: number | null;
  netVolumeMl?: number | null;

  isOnSale?: boolean;
  salePrice?: number | null;
  saleEndDate?: string | Date | null;
  discountPercent?: number | null;

  minPurchaseQty?: number | null;
  qtyStep?: number | null;
  maxPurchaseQty?: number | null;
  allowsDecimals?: boolean;

  measurementUnit?: string | null;
  unitMultiplier?: number | null;
};

function extractProducts(data: unknown): ProductWithCategory[] {
  if (Array.isArray(data)) return data as ProductWithCategory[];

  if (data && typeof data === "object") {
    const anyData = data as any;
    if (Array.isArray(anyData.products)) return anyData.products as ProductWithCategory[];
    if (Array.isArray(anyData.items)) return anyData.items as ProductWithCategory[];
    if (Array.isArray(anyData.data)) return anyData.data as ProductWithCategory[];
  }

  return [];
}

function hasActiveOffer(product: ProductWithCategory) {
  if (!product.isOnSale) return false;
  if (!product.saleEndDate) return true;

  const t = new Date(product.saleEndDate).getTime();
  if (!Number.isFinite(t)) return true;

  return t > Date.now();
}

function getEffectivePrice(product: ProductWithCategory) {
  const offerActive = hasActiveOffer(product);

  if (offerActive && product.salePrice != null && product.salePrice > 0) {
    return product.salePrice;
  }

  return product.price;
}

function getPriceInfo(product: ProductWithCategory) {
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

function calcDiscountPercent(original: number, sale: number) {
  if (!Number.isFinite(original) || !Number.isFinite(sale)) return null;
  if (original <= 0 || sale <= 0 || sale >= original) return null;
  return Math.round(((original - sale) / original) * 100);
}

export default function OfertasClient() {
  const [offers, setOffers] = useState<ProductWithCategory[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let alive = true;

    const fetchOffers = async () => {
      setOffersLoading(true);
      setOffersError(null);
      try {
        const res = await fetch("/api/products?onSale=true", {
          cache: "no-store",
        });

        if (!res.ok) {
          console.error("[OfertasPage] Error", res.status, "al cargar ofertas");
          if (alive) setOffersError("No pudimos cargar las ofertas. Intentá de nuevo.");
          return;
        }

        const data = (await res.json()) as unknown;
        const list = extractProducts(data);
        const active = list.filter(hasActiveOffer);

        if (alive) setOffers(active);
      } catch (err) {
        console.error("[OfertasPage] fetch error:", err);
        if (alive) setOffersError("No pudimos cargar las ofertas. Verificá tu conexión.");
      } finally {
        if (alive) setOffersLoading(false);
      }
    };

    fetchOffers();

    return () => {
      alive = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  return (
    <section className="w-full py-16 bg-background">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-600/20 rounded-full px-4 py-2 mb-4">
            <Tag className="h-4 w-4 text-red-500" />
            <span className="text-red-500 font-semibold">
              Ofertas por tiempo limitado
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold">
            🔥 Ofertas de la semana
          </h1>

          <p className="text-muted-foreground mt-2">
            Aprovechá precios especiales antes de que se terminen.
          </p>
        </div>

        {offersLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-card rounded-lg border p-4 animate-pulse">
                <div className="aspect-square bg-muted rounded-lg mb-4" />
                <div className="h-6 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : offersError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center border rounded-xl bg-muted/20">
            <AlertTriangle className="h-10 w-10 text-red-500" />
            <p className="font-medium text-lg">
              No pudimos cargar las ofertas. Intentá de nuevo más tarde.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setOffers([]); setFetchKey((k) => k + 1); }}
            >
              Reintentar
            </Button>
          </div>
        ) : offers.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {offers.map((product, index) => {
              const priceInfo = getPriceInfo(product);
              const effectivePrice = getEffectivePrice(product);
              const vatRate = getVatRate(product);
              const netPrice = netFromGrossCents(effectivePrice, vatRate);

              const discount =
                priceInfo.hasSale &&
                typeof priceInfo.originalPrice === "number" &&
                typeof priceInfo.salePrice === "number" &&
                priceInfo.salePrice < priceInfo.originalPrice
                  ? product.discountPercent ??
                    calcDiscountPercent(priceInfo.originalPrice, priceInfo.salePrice)
                  : null;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="bg-card rounded-lg border overflow-hidden hover:shadow-lg transition-shadow group h-full"
                >
                  <div className="relative aspect-square bg-muted">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Beef className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}

                    {product.saleEndDate ? (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 w-[70%] max-w-[220px]">
                        <CountdownTimer
                          endDate={
                            product.saleEndDate instanceof Date
                              ? product.saleEndDate.toISOString()
                              : String(product.saleEndDate)
                          }
                        />
                      </div>
                    ) : null}

                    <div className="absolute bottom-2 left-2 z-20 flex flex-col gap-1 items-start">
                      {priceInfo.hasSale && (
                        <Badge className="bg-red-600 text-white">
                          <Tag className="h-3 w-3 mr-1" />
                          Oferta
                        </Badge>
                      )}

                      {discount !== null && (
                        <Badge className="bg-black text-white font-bold">
                          -{discount}%
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <Link href={`/productos/${product.slug}`}>
                      <h3 className="font-semibold text-lg hover:text-primary transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                    </Link>

                    <div className="flex items-baseline gap-2">
                      {priceInfo.hasSale &&
                      typeof priceInfo.salePrice === "number" ? (
                        <>
                          <span className="text-sm text-muted-foreground line-through">
                            {formatPrice(priceInfo.originalPrice ?? product.price)}
                          </span>
                          <span className="text-2xl font-bold text-primary">
                            {formatPrice(priceInfo.salePrice)}
                          </span>
                        </>
                      ) : (
                        <span className="text-2xl font-bold text-primary">
                          {formatPrice(product.price)}
                        </span>
                      )}

                    </div>

                    {(() => {
                      if (!product.measurementUnit || product.unitMultiplier == null) return null;
                      const result = computeUnitPrice(effectivePrice, product.measurementUnit, product.unitMultiplier);
                      return result ? (
                        <p className="text-xs font-medium text-muted-foreground">
                          {result.label}
                        </p>
                      ) : null;
                    })()}

                    <p className="text-[11px] text-muted-foreground">
                      precio sin impuestos nacionales: {formatPrice(netPrice)}
                    </p>

                    <Link href={`/productos/${product.slug}`} className="block">
                      <Button
                        size="sm"
                        className="w-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                        type="button"
                      >
                        Ver oferta
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-10 border rounded-xl bg-muted/20">
            <p className="font-medium">Hoy no hay ofertas activas.</p>
            <p className="text-sm">
              Volvé más tarde: las promos cambian seguido.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}