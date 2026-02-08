"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { Loader2, Award } from "lucide-react";
import { motion } from "framer-motion";
import type { Product, Category } from "@prisma/client";

type ProductWithCategory = Product & { category: Category };

export default function ElaboradosPage() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        // ✅ SOLO elaborados (raíz + hijas) según tu /api/products
        const res = await fetch("/api/products?section=elaborados", {
          cache: "no-store",
        });

        const data = res.ok ? ((await res.json()) as ProductWithCategory[]) : [];
        if (!alive) return;

        setProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching elaborados products:", error);
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
        <div className="inline-flex items-center gap-2 bg-amber-600/10 border border-amber-600/20 rounded-full px-6 py-2 mb-4">
          <Award className="h-5 w-5 text-amber-600" />
          <span className="text-amber-600 font-semibold">
            Elaboración artesanal
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-4">Elaborados</h1>

        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Productos elaborados en casa, con recetas tradicionales y materia prima
          de calidad.
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
          <div className="text-3xl mb-2">🥩</div>
          <h3 className="font-semibold mb-2">Hechos en casa</h3>
          <p className="text-sm text-muted-foreground">
            Preparados con recetas propias y atención al detalle
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">✅</div>
          <h3 className="font-semibold mb-2">Frescos</h3>
          <p className="text-sm text-muted-foreground">
            Producción chica, rotación rápida
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">👌</div>
          <h3 className="font-semibold mb-2">Calidad premium</h3>
          <p className="text-sm text-muted-foreground">
            Selección de materias primas y buena mano
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
          <h2 className="text-2xl font-bold mb-6">Nuestros elaborados</h2>

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
          <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">
            No hay elaborados disponibles
          </h3>
          <p className="text-muted-foreground">
            Volvé pronto para ver nuestros productos frescos
          </p>
        </div>
      )}
    </div>
  );
}
