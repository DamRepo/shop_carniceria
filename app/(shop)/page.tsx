"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeroSlider } from "@/components/hero-slider";
import { CountdownTimer } from "@/components/countdown-timer";
import { ProductRowSlider } from "@/components/product-row-slider";
import { FeaturedCategoryCardVertical } from "@/components/featured-category-card-vertical";
import { PromoDoubleBanner } from "@/components/promo-double-banner";
import { FeaturedCategoryCardHorizontal } from "@/components/featured-category-card-horizontal";
import { ShoppingCart } from "lucide-react";
import {
  Beef,
  Award,
  Clock,
  Tag,
  Star,
  Sparkles,
  Flame,
} from "lucide-react";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { toast } from "sonner";

import {
  formatPrice,
  getVatRate,
  netFromGrossCents,
} from "@/lib/utils-format";
import { computeUnitPrice } from "@/lib/unitPrice";
import { useCartStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { StoreLocation } from "@/components/store-location";

type ProductWithSale = Product & {
  saleEndDate?: string | Date | null;
  isOnSale?: boolean | null;
  salePrice?: number | null;
  originalPrice?: number | null;
  discountPercent?: number | null;
  vatRate?: number | null;
  category?: { vatRate?: number | null } | null;
};

const features = [
  {
    icon: Beef,
    title: "Productos Frescos",
    description:
      "Carnes y embutidos de primera calidad, frescos todos los días",
  },
  {
    icon: Award,
    title: "Elaboración Propia",
    description: "Embutidos artesanales elaborados en nuestra fábrica",
  },
  {
    icon: Clock,
    title: "Atención Rápida",
    description: "Pedidos listos para retirar o recibir en tu domicilio",
  },
];

function getPriceInfo(p: ProductWithSale | Product) {
  const anyP = p as Partial<ProductWithSale> & {
    price?: number;
    unitType?: string;
  };

  const unitLabel = anyP.unitType === "PER_KG" ? "kg" : "unidad";
  const price = typeof anyP.price === "number" ? anyP.price : null;

  const originalPrice =
    typeof anyP.originalPrice === "number" ? anyP.originalPrice : price;

  const salePrice = typeof anyP.salePrice === "number" ? anyP.salePrice : null;

  const discountPercent =
    typeof anyP.discountPercent === "number" ? anyP.discountPercent : null;

  const computedSalePrice =
    salePrice === null && discountPercent !== null && originalPrice !== null
      ? Math.round(originalPrice * (1 - discountPercent / 100))
      : salePrice;

  const isOnSaleFlag = (anyP.isOnSale ?? false) === true;

  const hasSale =
    isOnSaleFlag &&
    originalPrice !== null &&
    computedSalePrice !== null &&
    computedSalePrice < originalPrice;

  return {
    unitLabel,
    hasSale,
    originalPrice,
    salePrice: computedSalePrice,
    normalPrice: price,
  };
}

function getEffectivePrice(p: ProductWithSale | Product): number {
  const info = getPriceInfo(p);
  if (info.hasSale && typeof info.salePrice === "number") return info.salePrice;
  if (typeof info.normalPrice === "number") return info.normalPrice;
  return 0;
}

type HomeSliderCardProps = {
  product: ProductWithSale;
  showFeaturedBadge?: boolean;
  showOfferCountdown?: boolean;
  showOfferBadge?: boolean;
  discountBadgeMode?: "top-right" | "bottom-left";
};

function HomeSliderCard({
  product,
  showFeaturedBadge = false,
  showOfferCountdown = false,
  showOfferBadge = true,
  discountBadgeMode = "top-right",
}: HomeSliderCardProps) {
  const addItem = useCartStore((state) => state.addItem);

  const priceInfo = getPriceInfo(product);
  const effectivePrice = getEffectivePrice(product);
  const vatRate = getVatRate(product);
  const netPrice = netFromGrossCents(effectivePrice, vatRate);

  const discount =
    priceInfo.hasSale &&
    typeof priceInfo.originalPrice === "number" &&
    typeof priceInfo.salePrice === "number" &&
    priceInfo.salePrice < priceInfo.originalPrice
      ? Math.round(
          ((priceInfo.originalPrice - priceInfo.salePrice) /
            priceInfo.originalPrice) *
            100
        )
      : null;

  const showLowStock = product.stock > 0 && product.stock < 10;
  const noStock = product.stock === 0;

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (noStock) {
      toast.error("Producto sin stock");
      return;
    }

    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: effectivePrice,
      quantity: 1,
      unitType: product.unitType ?? "PER_KG",
      image: product.image ?? undefined,
      vatRate,
    });

    toast.success(
      `${product.name} agregado al carrito${
        (product.unitType ?? "PER_KG") === "PER_KG" ? " (1 kg)" : " (1 un)"
      }`
    );
  };

  return (
    <Link href={`/productos/${product.slug}`} className="block h-full">
      <motion.article
        className="
          group flex h-full min-h-[340px] flex-col overflow-hidden rounded-lg border bg-card
          transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg
        "
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 220px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Beef className="h-16 w-16 text-muted-foreground" />
            </div>
          )}

          {showFeaturedBadge ? (
            <Badge className="absolute right-2 top-2 bg-primary text-primary-foreground">
              <Star className="mr-1 h-3 w-3" fill="currentColor" />
              Destacado
            </Badge>
          ) : null}

          {showOfferCountdown && product.saleEndDate ? (
            <div className="absolute left-1/2 top-2 z-20 w-[88%] max-w-[240px] -translate-x-1/2">
              <CountdownTimer
                endDate={
                  product.saleEndDate instanceof Date
                    ? product.saleEndDate.toISOString()
                    : String(product.saleEndDate)
                }
              />
            </div>
          ) : null}

          {showOfferBadge &&
          priceInfo.hasSale &&
          discountBadgeMode === "top-right" ? (
            <div className="absolute right-2 top-2 z-20 flex flex-col items-end gap-1">
              <Badge className="bg-red-600 text-white">
                <Tag className="mr-1 h-3 w-3" />
                Oferta
              </Badge>
              {discount !== null ? (
                <Badge className="bg-black font-bold text-white">
                  -{discount}%
                </Badge>
              ) : null}
            </div>
          ) : null}

          {showOfferBadge &&
          priceInfo.hasSale &&
          discountBadgeMode === "bottom-left" ? (
            <div className="absolute bottom-2 left-2 z-20 flex flex-col gap-2">
              <Badge className="w-fit bg-red-600 text-white shadow-sm">
                <Tag className="mr-1 h-3 w-3" />
                Oferta
              </Badge>
              {discount !== null ? (
                <Badge className="w-fit bg-black font-bold text-white shadow-sm">
                  -{discount}%
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3
            className="
              line-clamp-2 overflow-hidden text-[17px] font-semibold
              leading-snug transition-colors group-hover:text-primary
            "
            title={product.name}
          >
            {product.name}
          </h3>

          <div className="mt-2">
            {priceInfo.hasSale && typeof priceInfo.salePrice === "number" ? (
              <>
                <div className="truncate text-sm text-muted-foreground line-through">
                  {formatPrice(priceInfo.originalPrice ?? product.price)}
                </div>

                <div className="flex items-baseline gap-2 overflow-hidden">
                  <span className="truncate text-2xl font-bold text-primary">
                    {formatPrice(priceInfo.salePrice)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-baseline gap-2 overflow-hidden">
                <span className="truncate text-2xl font-bold text-primary">
                  {formatPrice(product.price)}
                </span>
              </div>
            )}
          </div>

          {(() => {
            if (!product.measurementUnit || product.unitMultiplier == null) return null;
            const result = computeUnitPrice(effectivePrice, product.measurementUnit, product.unitMultiplier);
            return result ? (
              <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                {result.label}
              </p>
            ) : null;
          })()}

          <div className="mt-1">
            <p
              className="line-clamp-2 overflow-hidden text-[11px] leading-tight text-muted-foreground"
              title={`precio sin impuestos nacionales: ${formatPrice(netPrice)}`}
            >
              precio sin impuestos nacionales: {formatPrice(netPrice)}
            </p>
          </div>

          <div className="mt-2">
            {showLowStock ? (
              <Badge
                variant="outline"
                className="border-orange-500 text-xs text-orange-500"
              >
                ¡Últimas unidades!
              </Badge>
            ) : noStock ? (
              <Badge
                variant="outline"
                className="border-red-500 text-xs text-red-500"
              >
                Sin stock
              </Badge>
            ) : null}
          </div>

          <div className="mt-auto pt-4">
            <Button
              type="button"
              className="w-full font-semibold"
              onClick={handleAddToCart}
              disabled={noStock}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {noStock ? "Sin stock" : "Agregar"}
            </Button>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}

export default function HomePage() {
  const [ref1, inView1] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [ref2, inView2] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [ref3, inView3] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [ref4, inView4] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [ref5, inView5] = useInView({ triggerOnce: true, threshold: 0.1 });

  const [featuredProducts, setFeaturedProducts] = useState<ProductWithSale[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  const [offers, setOffers] = useState<ProductWithSale[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);

  const [randomProducts, setRandomProducts] = useState<ProductWithSale[]>([]);
  const [randomLoading, setRandomLoading] = useState(true);

  const [bestSellers, setBestSellers] = useState<ProductWithSale[]>([]);
  const [bestSellersLoading, setBestSellersLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await fetch("/api/products?featured=true&limit=8", { cache: "no-store" });
        if (!response.ok) throw new Error("Error al cargar productos");
        const data = await response.json();
        setFeaturedProducts(data);
      } catch (error) {
        console.error("Error fetching featured products:", error);
        toast.error("Error al cargar productos destacados");
      } finally {
        setLoading(false);
      }
    };

    const fetchOffers = async () => {
      try {
        const response = await fetch("/api/products?onSale=true&limit=4", { cache: "no-store" });
        if (!response.ok) throw new Error("Error al cargar ofertas");
        const data = await response.json();
        setOffers(data);
      } catch (error) {
        console.error("Error fetching offers:", error);
      } finally {
        setOffersLoading(false);
      }
    };

    const fetchRandomProducts = async () => {
      try {
        const response = await fetch("/api/products/random", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Error al cargar productos aleatorios");
        }

        const data = await response.json();
        setRandomProducts(data);
      } catch (error) {
        console.error("Error fetching random products:", error);
      } finally {
        setRandomLoading(false);
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

    fetchFeaturedProducts();
    fetchOffers();
    fetchRandomProducts();
    fetchBestSellers();
  }, []);

  return (
    <div className="flex flex-col">
      <section className="w-full">
        <HeroSlider />
      </section>

      <section className="w-full bg-background/95 py-6 sm:py-8">
        <div className="container mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col items-center space-y-4 text-center sm:space-y-6"
          >
            <h1 className="text-2xl font-bold sm:text-3xl md:text-4xl">
              Carnicería <span className="text-primary">El Negro</span>
            </h1>

            <p className="max-w-2xl text-base text-zinc-300 sm:text-lg">
              La mejor selección de carnes rojas, pollo, embutidos caseros y
              productos congelados. Calidad garantizada y precios que cuidan tu
              bolsillo.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/ofertas">
                <Button
                  size="lg"
                  className="bg-primary px-10 text-lg hover:bg-primary/80 transition-colors"
                >
                  <Tag className="mr-2 h-5 w-5" />
                  Ver Ofertas
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section ref={ref3} className="w-full bg-muted/30 py-8 sm:py-16">
        <div className="container mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView3 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 text-center sm:mb-12"
          >
            <div className="mb-4 flex items-center justify-center gap-2">
              <Star className="h-8 w-8 text-primary" fill="currentColor" />
              <h2 className="text-3xl font-bold md:text-4xl">
                Productos Destacados
              </h2>
              <Star className="h-8 w-8 text-primary" fill="currentColor" />
            </div>

            <p className="text-lg text-muted-foreground">
              Nuestros mejores cortes y productos seleccionados especialmente
              para vos
            </p>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
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
          ) : featuredProducts.length > 0 ? (
            <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-6">
              <div className="w-full md:hidden">
                <FeaturedCategoryCardHorizontal
                  href="/elaborados"
                  imageSrc="/embutidos-horizontal.png"
                />
              </div>

              <div className="hidden md:block md:w-[220px] md:shrink-0">
                <div className="h-full min-h-[355px]">
                  <FeaturedCategoryCardVertical
                    href="/elaborados"
                    imageSrc="/embutidos.png"
                  />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <ProductRowSlider
                  items={featuredProducts}
                  renderItem={(product) => (
                    <HomeSliderCard
                      product={product}
                      showFeaturedBadge
                      showOfferBadge
                      discountBadgeMode="top-right"
                    />
                  )}
                />
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <p>No hay productos destacados en este momento</p>
            </div>
          )}
        </div>
      </section>

      <section ref={ref5} className="w-full bg-background py-8 sm:py-16">
        <div className="container mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView5 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 text-center sm:mb-12"
          >
            <div className="mb-4 flex items-center justify-center gap-2">
              <Flame className="h-8 w-8 text-orange-500" fill="currentColor" />
              <h2 className="text-3xl font-bold md:text-4xl">Más Vendidos</h2>
              <Flame className="h-8 w-8 text-orange-500" fill="currentColor" />
            </div>
            <p className="text-lg text-muted-foreground">
              Los productos que más eligen nuestros clientes
            </p>
          </motion.div>

          {bestSellersLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
                <HomeSliderCard
                  product={product}
                  showOfferBadge
                  discountBadgeMode="top-right"
                />
              )}
            />
          ) : (
            <div className="rounded-xl border bg-muted/20 py-10 text-center text-muted-foreground">
              <p className="font-medium">Aún no hay datos de ventas.</p>
            </div>
          )}
        </div>
      </section>

      <section ref={ref1} className="w-full bg-background py-8 sm:py-16">
        <div className="container mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView1 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 text-center sm:mb-12"
          >
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              ¿Por qué elegirnos?
            </h2>
            <p className="text-lg text-muted-foreground">
              Más de 7 años brindando calidad y servicio
            </p>
          </motion.div>

          <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-8 sm:overflow-visible sm:pb-0">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={
                    inView1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                  }
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="flex min-w-[200px] shrink-0 flex-col items-center rounded-lg border bg-card p-4 text-center shadow-sm transition-shadow hover:shadow-md sm:min-w-0 sm:p-6"
                >
                  <Icon className="mb-3 h-8 w-8 text-primary sm:mb-4 sm:h-12 sm:w-12" />
                  <h3 className="mb-1 text-base font-semibold sm:mb-2 sm:text-xl">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground sm:text-base">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="w-full bg-background py-8 sm:py-16">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="mb-6 text-center sm:mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-600/20 bg-red-600/10 px-4 py-2">
              <Tag className="h-4 w-4 text-red-500" />
              <span className="font-semibold text-red-500">
                Ofertas por tiempo limitado
              </span>
            </div>

            <h2 className="text-3xl font-bold md:text-4xl">
              🔥 Ofertas de la semana
            </h2>

            <p className="mt-2 text-muted-foreground">
              Aprovechá precios especiales antes de que se terminen.
            </p>

            <div className="mt-4">
              <Link href="/ofertas">
                <Button
                  variant="outline"
                  className="border-zinc-700 hover:bg-zinc-900"
                  type="button"
                >
                  Ver todas
                </Button>
              </Link>
            </div>
          </div>

          {offersLoading ? (
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
          ) : offers.length > 0 ? (
            <div className="flex items-stretch gap-4 md:gap-6">
              <div className="min-w-0 flex-1">
                <ProductRowSlider
                  items={offers}
                  renderItem={(product) => (
                    <HomeSliderCard
                      product={product}
                      showOfferCountdown
                      showOfferBadge
                      discountBadgeMode="bottom-left"
                    />
                  )}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-muted/20 py-10 text-center text-muted-foreground">
              <p className="font-medium">Hoy no hay ofertas activas.</p>
              <p className="text-sm">
                Volvé más tarde: las promos cambian seguido.
              </p>
            </div>
          )}
        </div>
      </section>

      <PromoDoubleBanner
        left={{
          href: "/productos?category=pollo",
          imageSrc: "/calisa.png",
          alt: "pollos calisa",
        }}
        right={{
          href: "/productos?category=congelados",
          imageSrc: "/congelados.png",
          alt: "congelados caseros",
        }}
      />

      <section ref={ref2} className="w-full bg-muted/50 py-8 sm:py-16">
        <div className="container mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={
              inView2
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 0.95 }
            }
            transition={{ duration: 0.6 }}
            className="rounded-2xl border bg-gradient-to-r from-primary/10 to-secondary/10 p-5 text-center sm:p-8 md:p-12"
          >
            <h2 className="mb-3 text-2xl font-bold sm:mb-4 sm:text-3xl md:text-4xl">
              Pedí ahora y retirá en el día
            </h2>
            <p className="mx-auto mb-5 max-w-2xl text-base text-muted-foreground sm:mb-8 sm:text-lg">
              Hacé tu pedido online y retiralo en nuestro local en cualquier
              momento.
            </p>
            <Link href="/productos">
              <Button size="lg" variant="default" className="px-8 text-lg">
                Empezar a comprar
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <section ref={ref4} className="w-full bg-background py-8 sm:py-16">
        <div className="container mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView4 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 text-center sm:mb-10"
          >
            <div className="mb-4 flex items-center justify-center gap-2">
              <Sparkles className="h-7 w-7 text-primary" />
              <h2 className="text-3xl font-bold md:text-4xl">
                Descubrí más productos
              </h2>
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
          </motion.div>

          {randomLoading ? (
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
          ) : randomProducts.length > 0 ? (
            <ProductRowSlider
              items={randomProducts}
              renderItem={(product) => (
                <HomeSliderCard
                  product={product}
                  showOfferBadge
                  discountBadgeMode="top-right"
                />
              )}
            />
          ) : (
            <div className="rounded-xl border bg-muted/20 py-10 text-center text-muted-foreground">
              <p className="font-medium">
                No se pudieron cargar productos aleatorios.
              </p>
            </div>
          )}
        </div>
      </section>

      <StoreLocation />
    </div>
  );
}