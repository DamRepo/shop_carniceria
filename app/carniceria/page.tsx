"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { Loader2, ChefHat } from "lucide-react";
import { motion } from "framer-motion";
import type { Product, Category } from "@prisma/client";

type ProductWithCategory = Product & { category: Category };

export default function CarniceriaPage() {
  const [all, setAll] = useState<ProductWithCategory[]>([]);
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
        setAll(Array.isArray(data) ? (data as ProductWithCategory[]) : []);
      } catch (e) {
        console.error("Error fetching carniceria products:", e);
        if (alive) setAll([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadProducts();

    return () => {
      alive = false;
    };
  }, []);

  // Agrupar productos por categoría
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { label: string; items: ProductWithCategory[] }
    >();

    for (const p of all) {
      const slug = p.category?.slug ?? "carniceria";
      const label = p.category?.name ?? "Carnicería";

      const group = map.get(slug) ?? { label, items: [] };
      group.items.push(p);
      map.set(slug, group);
    }

    return Array.from(map.entries())
      .map(([slug, v]) => ({
        slug,
        label: v.label,
        items: v.items,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [all]);

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
      {/* Header */}
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

      {/* Beneficios */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
      >
        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">🥩</div>
          <h3 className="font-semibold mb-2">Cortes frescos</h3>
          <p className="text-sm text-muted-foreground">
            Seleccionados y preparados todos los días
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">🔪</div>
          <h3 className="font-semibold mb-2">Atención de carnicero</h3>
          <p className="text-sm text-muted-foreground">
            Experiencia, conocimiento y cortes a pedido
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">❄️</div>
          <h3 className="font-semibold mb-2">Cadena de frío</h3>
          <p className="text-sm text-muted-foreground">
            Conservación óptima desde el mostrador hasta tu casa
          </p>
        </div>
      </motion.div>

      {groups.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">
            No hay productos cargados en Carnicería
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.slug} className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">
              {group.label} ({group.items.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {group.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
