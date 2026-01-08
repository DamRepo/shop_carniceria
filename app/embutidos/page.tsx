'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/product-card';
import { Loader2, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product, Category } from '@prisma/client';

type ProductWithCategory = Product & {
  category: Category;
};

export default function EmbutidosPage() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          // Filtrar solo embutidos
          const embutidos = data.filter((product: ProductWithCategory) => {
            const categoryName = product.category?.name?.toLowerCase() || '';
            const productName = product.name?.toLowerCase() || '';
            return (
              categoryName.includes('embutido') ||
              productName.includes('chorizo') ||
              productName.includes('salchicha') ||
              productName.includes('morcilla') ||
              productName.includes('longaniza') ||
              productName.includes('bondiola')
            );
          });
          setProducts(embutidos);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
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
          <span className="text-amber-600 font-semibold">Elaboración Artesanal</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Embutidos Caseros</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Elaborados artesanalmente con las mejores materias primas y recetas tradicionales
        </p>
      </motion.div>

      {/* Destacados/Beneficios */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
      >
        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">🥩</div>
          <h3 className="font-semibold mb-2">100% Caseros</h3>
          <p className="text-sm text-muted-foreground">
            Elaborados en el día con recetas tradicionales
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">✅</div>
          <h3 className="font-semibold mb-2">Sin Conservantes</h3>
          <p className="text-sm text-muted-foreground">
            Productos naturales y frescos
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">👌</div>
          <h3 className="font-semibold mb-2">Calidad Premium</h3>
          <p className="text-sm text-muted-foreground">
            Seleccionamos las mejores carnes
          </p>
        </div>
      </motion.div>

      {/* Lista de productos */}
      {products.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-2xl font-bold mb-6">Nuestros Embutidos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        <div className="text-center py-20">
          <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No hay embutidos disponibles</h3>
          <p className="text-muted-foreground">
            Volvé pronto para ver nuestros productos frescos
          </p>
        </div>
      )}
    </div>
  );
}
