"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { CountdownTimer } from "@/components/countdown-timer";
import { Loader2, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

// DTOs (tipos del JSON que viene desde /api/products)
type CategoryDTO = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
};

type ProductWithCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;

  unitType: "PER_KG" | "PER_UNIT";
  price: number;
  stock: number;

  isActive: boolean;
  isFeatured: boolean;
  isOnSale: boolean;
  salePrice?: number | null;
  saleEndDate?: string | null; // ISO string
  discountPercent?: number | null;

  categoryId: string;
  category: CategoryDTO;
};

// Tipo mínimo y estable para ProductCard (sin any)
// Si tu ProductCard pide más campos, los agregamos luego (pero esto ya evita el problema imageUrl)
type CardProduct = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  unitType: "PER_KG" | "PER_UNIT";
  price: number;
  stock: number;
  isOnSale: boolean;
  salePrice?: number | null;
  saleEndDate?: string | null;
  discountPercent?: number | null;
  isFeatured?: boolean;
};

function toCardProduct(p: ProductWithCategory): CardProduct {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description ?? null,
    image: p.image ?? null, // ✅ PRODUCT usa `image` (Prisma)
    unitType: p.unitType,
    price: p.price,
    stock: p.stock,
    isOnSale: p.isOnSale,
    salePrice: p.salePrice ?? null,
    saleEndDate: p.saleEndDate ?? null,
    discountPercent: p.discountPercent ?? null,
    isFeatured: p.isFeatured ?? false,
  };
}

/**
 * Extrae lista de productos aunque el API devuelva:
 * - Array directo: [...]
 * - Objeto: { products: [...] }
 * - Otros: { items: [...] } / { data: [...] }
 */
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

/**
 * Oferta activa:
 * - isOnSale true
 * - si no hay saleEndDate => activa
 * - si saleEndDate existe pero es inválida => NO la descartamos (mejor mostrarla)
 * - si es válida => debe ser futura
 */
function isOfferActive(p: ProductWithCategory) {
  if (!p.isOnSale) return false;
  if (!p.saleEndDate) return true;

  const t = new Date(p.saleEndDate).getTime();
  if (!Number.isFinite(t)) return true;

  return t > Date.now();
}

export default function OfertasPage() {
  const [offers, setOffers] = useState<ProductWithCategory[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    let alive = true;

    const fetchOffers = async () => {
      try {
        const res = await fetch("/api/products?onSale=true", { cache: "no-store" });
        if (!res.ok) {
          console.error("fetchOffers: res not ok", res.status);
          return;
        }

        const data = (await res.json()) as unknown;
        const list = extractProducts(data);
        const active = list.filter(isOfferActive);

        if (alive) setOffers(active);
      } catch (error) {
        console.error("Error al cargar ofertas:", error);
      } finally {
        if (alive) setLoading(false);
      }
    };

    const fetchRelatedProducts = async () => {
      try {
        const res = await fetch("/api/products?limit=12", { cache: "no-store" });
        if (!res.ok) {
          console.error("fetchRelatedProducts: res not ok", res.status);
          return;
        }

        const data = (await res.json()) as unknown;
        const list = extractProducts(data);
        const related = list.filter((p) => !p.isOnSale);

        if (alive) setRelatedProducts(related);
      } catch (error) {
        console.error("Error al cargar productos relacionados:", error);
      }
    };

    fetchOffers();
    fetchRelatedProducts();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-600/20 rounded-full px-6 py-2 mb-4">
          <Tag className="h-5 w-5 text-red-600" />
          <span className="text-red-600 font-semibold">Ofertas Especiales</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">¡Aprovechá nuestras ofertas!</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Descuentos exclusivos en productos seleccionados. Ofertas por tiempo limitado.
        </p>
      </motion.div>

      {/* Ofertas Activas */}
      {offers.length > 0 ? (
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Ofertas Activas</h2>
            <p className="text-muted-foreground">{offers.length} productos en oferta</p>
          </div>

          <motion.div
            ref={ref}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
          
            {offers.map((product, index) => {
              const cardProduct = toCardProduct(product);

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="relative">
                    {/* Timer solo si hay fecha */}
                    {product.saleEndDate ? (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 w-11/12">
                        <CountdownTimer endDate={product.saleEndDate} />
                      </div>
                    ) : null}

                    <ProductCard product={cardProduct} />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      ) : (
        <div className="text-center py-20">
          <Tag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No hay ofertas disponibles</h3>
          <p className="text-muted-foreground">
            Volvé pronto para ver nuestras próximas ofertas especiales
          </p>
        </div>
      )}

      {/* Productos Relacionados */}
      {relatedProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">También te puede interesar</h2>
            <p className="text-muted-foreground">Otros productos que podrían gustarte</p>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
            {relatedProducts.slice(0, 4).map((product) => {
              const cardProduct = toCardProduct(product);
              return <ProductCard key={product.id} product={cardProduct} />;
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}