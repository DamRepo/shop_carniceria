'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/product-card';
import { CountdownTimer } from '@/components/countdown-timer';
import { Loader2, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import type { Product, Category } from '@prisma/client';

type ProductWithCategory = Product & {
  category: Category;
};

export default function OfertasPage() {
  const [offers, setOffers] = useState<ProductWithCategory[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const res = await fetch('/api/products?onSale=true');
        if (res.ok) {
          const data = await res.json();
          setOffers(data);
        }
      } catch (error) {
        console.error('Error al cargar ofertas:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchRelatedProducts = async () => {
      try {
        const res = await fetch('/api/products?limit=6');
        if (res.ok) {
          const data = await res.json();
          setRelatedProducts(data.filter((p: ProductWithCategory) => !p.isOnSale));
        }
      } catch (error) {
        console.error('Error al cargar productos relacionados:', error);
      }
    };

    fetchOffers();
    fetchRelatedProducts();
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
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          ¡Aprovechá nuestras ofertas!
        </h1>
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
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {offers.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="relative">
                  {product.saleEndDate && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 w-11/12">
                      <CountdownTimer endDate={product.saleEndDate} />
                    </div>
                  )}
                  <ProductCard product={product} />
                </div>
              </motion.div>
            ))}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {relatedProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
