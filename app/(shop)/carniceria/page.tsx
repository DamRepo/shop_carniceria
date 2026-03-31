"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { Loader2, ChefHat } from "lucide-react";
import { motion } from "framer-motion";
import { CategoryFilterBar } from "@/components/category-filter-bar";
import type { FilterOptions } from "@/components/product-filters";

type CategoryDTO = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
};

type ProductDTO = {
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
  saleEndDate?: string | null;
  discountPercent?: number | null;
  measurementUnit?: string;
  unitMultiplier?: number;
  brand?: string | null;
  categoryId: string;
  category: CategoryDTO;
};

export default function CarniceriaPage() {
  const [all, setAll] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;

    const loadProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/products?section=carniceria");
        if (!res.ok) throw new Error("Fetch failed");
        const data = (await res.json()) as unknown;
        if (!alive) return;
        setAll(Array.isArray(data) ? (data as ProductDTO[]) : []);
      } catch (e) {
        console.error("Error fetching carniceria products:", e);
        if (alive) setAll([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadProducts();
    return () => { alive = false; };
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
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-6 py-2 mb-4">
          <ChefHat className="h-5 w-5 text-primary" />
          <span className="text-primary font-semibold">Carnicería</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-4">Carnicería</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Cortes frescos y seleccionados. Calidad garantizada.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-3 gap-2 mb-6 sm:gap-4 md:gap-6 md:mb-10"
      >
        <div className="bg-muted/50 rounded-lg p-3 text-center sm:p-4 md:p-6">
          <div className="text-xl mb-1 sm:text-2xl md:text-3xl md:mb-2">🥩</div>
          <h3 className="font-semibold text-xs sm:text-sm md:text-base leading-tight">Cortes frescos</h3>
          <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
            Seleccionados y preparados todos los días
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 text-center sm:p-4 md:p-6">
          <div className="text-xl mb-1 sm:text-2xl md:text-3xl md:mb-2">🔪</div>
          <h3 className="font-semibold text-xs sm:text-sm md:text-base leading-tight">Atención de carnicero</h3>
          <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
            Experiencia, conocimiento y cortes a pedido
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 text-center sm:p-4 md:p-6">
          <div className="text-xl mb-1 sm:text-2xl md:text-3xl md:mb-2">❄️</div>
          <h3 className="font-semibold text-xs sm:text-sm md:text-base leading-tight">Cadena de frío</h3>
          <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
            Conservación óptima desde el mostrador hasta tu casa
          </p>
        </div>
      </motion.div>

      {all.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">
            No hay productos cargados en Carnicería
          </p>
        </div>
      ) : (
        <CategoryFilterBar allProducts={all} label="Carnicería">
          {(filtered, _filters: FilterOptions) => {
            const filteredSet = new Set(filtered.map((p: any) => p.id));

            const groups = (() => {
              const map = new Map<string, { label: string; items: ProductDTO[] }>();
              for (const p of all) {
                if (!filteredSet.has(p.id)) continue;
                const slug = p.category?.slug ?? "carniceria";
                const label = p.category?.name ?? "Carnicería";
                const group = map.get(slug) ?? { label, items: [] };
                group.items.push(p);
                map.set(slug, group);
              }
              return Array.from(map.entries())
                .map(([slug, v]) => ({ slug, label: v.label, items: v.items }))
                .sort((a, b) => a.label.localeCompare(b.label));
            })();

            if (groups.length === 0) {
              return (
                <div className="text-center py-20 text-muted-foreground">
                  <p>No hay productos con los filtros aplicados.</p>
                </div>
              );
            }

            const multiGroup = groups.length > 1;

            return (
              <>
                {groups.map((group) => (
                  <section key={group.slug} className="mb-10">
                    {multiGroup && (
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4 pb-2 border-b">
                        {group.label} ({group.items.length})
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
                      {group.items.map((product) => (
                        <ProductCard key={product.id} product={product as any} />
                      ))}
                    </div>
                  </section>
                ))}
              </>
            );
          }}
        </CategoryFilterBar>
      )}
    </div>
  );
}
