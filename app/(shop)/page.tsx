"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { HeroSlider } from "@/components/hero-slider";
import { ProductRowSlider } from "@/components/product-row-slider";
import { ProductCard } from "@/components/product-card";
import { FeaturedCategoryCardVertical } from "@/components/featured-category-card-vertical";
import { PromoDoubleBanner } from "@/components/promo-double-banner";
import { FeaturedCategoryCardHorizontal } from "@/components/featured-category-card-horizontal";
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
  minPurchaseQty?: number | null;
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
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl tracking-wider">
              Carnicería <span className="text-primary">El Negro</span>
            </h1>

            <p className="max-w-2xl text-base text-zinc-300 sm:text-lg">
              La mejor selección de carnes rojas, pollo, embutidos caseros y
              productos congelados. Calidad garantizada y precios que cuidan tu
              bolsillo.
            </p>

          </motion.div>
        </div>
      </section>

      {(offersLoading || offers.length > 0) && (
        <section className="w-full bg-background py-8 sm:py-16">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="mb-6 text-center sm:mb-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-600/20 bg-red-600/10 px-4 py-2">
                <Tag className="h-4 w-4 text-red-500" />
                <span className="font-semibold text-red-500">
                  Ofertas por tiempo limitado
                </span>
              </div>

              <h2 className="font-display text-4xl md:text-5xl tracking-wider">
                🔥 Ofertas de hoy
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
                    Ver todas las ofertas
                  </Button>
                </Link>
              </div>
            </div>

            {offersLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {[...Array(6)].map((_, i) => (
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
            ) : (
              <ProductRowSlider
                items={offers}
                renderItem={(product) => (
                  <ProductCard product={adaptForCard(product)} />
                )}
              />
            )}
          </div>
        </section>
      )}

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
              <h2 className="font-display text-4xl md:text-5xl tracking-wider">
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
                    <ProductCard product={adaptForCard(product)} />
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
              <h2 className="font-display text-4xl md:text-5xl tracking-wider">Más Vendidos</h2>
              <Flame className="h-8 w-8 text-orange-500" fill="currentColor" />
            </div>
            <p className="text-lg text-muted-foreground">
              Los productos que más eligen nuestros clientes
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

      <section ref={ref1} className="w-full bg-background py-8 sm:py-16">
        <div className="container mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView1 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 text-center sm:mb-12"
          >
            <h2 className="mb-4 font-display text-4xl md:text-5xl tracking-wider">
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
                  className="flex min-w-[200px] shrink-0 flex-col items-center rounded-sm border border-iron hover:border-primary/40 bg-charcoal p-4 text-center transition-shadow hover:shadow-glow-red-sm sm:min-w-0 sm:p-6"
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

      <PromoDoubleBanner
        left={{
          href: "/productos?category=pollo",
          imageSrc: "/calisa.png",
          alt: "pollos calisa",
          label: "Pollos",
        }}
        right={{
          href: "/productos?category=congelados",
          imageSrc: "/congelados.png",
          alt: "congelados caseros",
          label: "Congelados",
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
            className="border border-iron border-l-4 border-l-primary bg-[#0D0D0D] p-5 text-center sm:p-8 md:p-12"
          >
            <h2 className="mb-3 font-display text-3xl sm:mb-4 sm:text-4xl md:text-5xl tracking-wider">
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
              <h2 className="font-display text-4xl md:text-5xl tracking-wider">
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
                <ProductCard product={adaptForCard(product)} />
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