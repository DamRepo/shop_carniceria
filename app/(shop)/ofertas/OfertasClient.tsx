"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Tag, Beef, AlertTriangle, ShoppingCart, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CountdownTimer } from "@/components/countdown-timer";

import {
  formatPrice,
  getVatRate,
  netFromGrossCents,
} from "@/lib/utils-format";
import { computeUnitPrice } from "@/lib/unitPrice";
import { useCartStore } from "@/lib/store";
import { toast } from "sonner";

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
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);

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
    <div className="w-full">
      <div className="relative overflow-hidden bg-gradient-to-br from-red-950 via-red-900 to-black py-16 sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(220,38,38,0.25),transparent_70%)]" />
        <div className="container relative mx-auto max-w-7xl px-4 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-600/20 px-4 py-1.5">
            <Zap className="h-4 w-4 text-red-400" />
            <span className="text-sm font-semibold uppercase tracking-wide text-red-300">
              Tiempo limitado
            </span>
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            Ofertas <span className="text-red-400">Especiales</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-red-100/70 sm:text-xl">
            Aprovechá precios especiales antes de que se terminen. Las promos cambian seguido.
          </p>
        </div>
      </div>

      <section className="w-full bg-background py-12">
        <div className="container mx-auto max-w-7xl px-4">

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
              const canBuy = (product.stock ?? 0) > 0;

              const discount =
                priceInfo.hasSale &&
                typeof priceInfo.originalPrice === "number" &&
                typeof priceInfo.salePrice === "number" &&
                priceInfo.salePrice < priceInfo.originalPrice
                  ? product.discountPercent ??
                    calcDiscountPercent(priceInfo.originalPrice, priceInfo.salePrice)
                  : null;

              const initialQty =
                product.unitType === "PER_KG"
                  ? Number(product.minPurchaseQty ?? 1) > 0
                    ? Number(product.minPurchaseQty)
                    : 1
                  : Number(product.minPurchaseQty ?? 1) > 0
                  ? Number(product.minPurchaseQty)
                  : 1;

              function wouldExceedStock(addQty: number): boolean {
                const stock = product.stock ?? 0;
                if (stock <= 0) return true;
                const existing = cartItems.find((i) => i.id === product.id);
                const existingQty = existing?.quantity ?? 0;
                const totalQty = existingQty + addQty;
                const totalRaw =
                  (product.unitType ?? "PER_KG") === "PER_KG"
                    ? Math.round(totalQty * 1000)
                    : Math.round(totalQty);
                return totalRaw > stock;
              }

              const handleAddToCart = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();

                if (!canBuy) return toast.error("Producto sin stock");
                if (wouldExceedStock(initialQty)) return toast.error("No hay más stock disponible");

                addItem({
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: effectivePrice,
                  quantity: initialQty,
                  unitType: product.unitType ?? "PER_KG",
                  image: product.image ?? undefined,
                  vatRate,
                });

                toast.success(
                  `${product.name} agregado al carrito${
                    (product.unitType ?? "PER_KG") === "PER_KG"
                      ? ` (${initialQty} kg)`
                      : ` (${initialQty} un)`
                  }`
                );
              };

              const handleBuyNow = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();

                if (!canBuy) return toast.error("Producto sin stock");
                if (wouldExceedStock(initialQty)) return toast.error("No hay más stock disponible");

                addItem({
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: effectivePrice,
                  quantity: initialQty,
                  unitType: product.unitType ?? "PER_KG",
                  image: product.image ?? undefined,
                  vatRate,
                });

                toast.success("Producto agregado, redirigiendo al checkout...");
                setTimeout(() => router.push("/checkout"), 450);
              };

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

                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={handleAddToCart}
                        disabled={!canBuy}
                        className="w-full"
                        variant="outline"
                        size="lg"
                        type="button"
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Agregar al carrito
                      </Button>

                      <Button
                        onClick={handleBuyNow}
                        disabled={!canBuy}
                        className="w-full bg-primary hover:bg-primary/90"
                        size="lg"
                        type="button"
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        Comprar ahora
                      </Button>
                    </div>
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
    </div>
  );
}