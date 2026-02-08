"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { Loader2, Leaf } from "lucide-react";
import { motion } from "framer-motion";
import type { Product, Category } from "@prisma/client";

type ProductWithCategory = Product & { category: Category };

export default function FruteriaYVerduleriaPage() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        // ✅ SOLO frutería y verdulería (raíz + hijas) según tu /api/products
        const res = await fetch(
          "/api/products?section=fruteria-y-verduleria",
          { cache: "no-store" }
        );

        const data = res.ok ? ((await res.json()) as ProductWithCategory[]) : [];
        if (!alive) return;

        setProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching fruteria products:", error);
        if (alive) setProducts([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12 text-center"
      >
        <div className="inline-flex items-center gap-2 bg-green-600/10 border border-green-600/20 rounded-full px-6 py-2 mb-4">
          <Leaf className="h-5 w-5 text-green-600" />
          <span className="text-green-600 font-semibold">Fresco del día</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Frutería y verdulería
        </h1>

        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Frutas y verduras seleccionadas, frescas y listas para tu mesa.
        </p>
      </motion.div>

      {/* Beneficios */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
      >
        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">🍎</div>
          <h3 className="font-semibold mb-2">Frutas de temporada</h3>
          <p className="text-sm text-muted-foreground">
            Variedad según estación y disponibilidad
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">🥬</div>
          <h3 className="font-semibold mb-2">Verduras frescas</h3>
          <p className="text-sm text-muted-foreground">
            Selección para ensaladas y cocina diaria
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">🚚</div>
          <h3 className="font-semibold mb-2">Listo para llevar</h3>
          <p className="text-sm text-muted-foreground">
            Pedí online y retirás en nuestro local 
          </p>
        </div>
      </motion.div>

      {/* Productos */}
      {products.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <h2 className="text-2xl font-bold mb-6">Productos frescos</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 * index }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        <div className="text-center py-20">
          <Leaf className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">
            No hay productos disponibles
          </h3>
          <p className="text-muted-foreground">
            Volvé pronto para ver frutas y verduras frescas
          </p>
        </div>
      )}
    </div>
  );
}
