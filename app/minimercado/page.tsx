"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { Loader2, ShoppingBasket } from "lucide-react";
import { motion } from "framer-motion";
import type { Product, Category } from "@prisma/client";

type ProductWithCategory = Product & { category: Category };

export default function MinimercadoPage() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;

    const loadProducts = async () => {
      try {
        setLoading(true);

        const res = await fetch("/api/products?section=minimercado");
        if (!res.ok) throw new Error("Fetch failed");

        const data = (await res.json()) as unknown;

        if (!alive) return;

        setProducts(Array.isArray(data) ? (data as ProductWithCategory[]) : []);
      } catch (error) {
        console.error("Error fetching minimercado products:", error);
        if (alive) setProducts([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadProducts();

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
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-green-600/10 border border-green-600/20 rounded-full px-6 py-2 mb-4">
          <ShoppingBasket className="h-5 w-5 text-green-600" />
          <span className="text-green-600 font-semibold">
            Todo en un lugar
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Minimercado
        </h1>

        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Además de carnes, encontrá todo lo que necesitás para tu cocina
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
          <div className="text-3xl mb-2">🛒</div>
          <h3 className="font-semibold mb-2">Compra completa</h3>
          <p className="text-sm text-muted-foreground">
            Todo lo que necesitás para tu cocina en un solo lugar
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">📦</div>
          <h3 className="font-semibold mb-2">Productos esenciales</h3>
          <p className="text-sm text-muted-foreground">
            Almacén, bebidas, lácteos y más, siempre disponibles
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">🚚</div>
          <h3 className="font-semibold mb-2">Rápido y práctico</h3>
          <p className="text-sm text-muted-foreground">
            Pedí online y retirás en nuestro local 
          </p>
        </div>
      </motion.div>

      {products.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">
            No hay productos cargados en Minimercado
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
