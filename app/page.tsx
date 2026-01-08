'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Beef, Award, Clock, Tag, ChefHat, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { HeroSlider } from '@/components/hero-slider';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils-format';
import type { Product } from '@/lib/types';

const features = [
  {
    icon: Beef,
    title: 'Productos Frescos',
    description: 'Carnes y embutidos de primera calidad, frescos todos los días',
  },
  {
    icon: Award,
    title: 'Elaboración Propia',
    description: 'Embutidos artesanales elaborados en nuestra fábrica',
  },
  {
    icon: Clock,
    title: 'Atención Rápida',
    description: 'Pedidos listos para retirar o recibir en tu domicilio',
  },
];

export default function HomePage() {
  const [ref1, inView1] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [ref2, inView2] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [ref3, inView3] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const addToCart = useCartStore((state) => state.addItem);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await fetch('/api/products?featured=true&limit=8');
        if (!response.ok) throw new Error('Error al cargar productos');
        const data = await response.json();
        setFeaturedProducts(data);
      } catch (error) {
        console.error('Error fetching featured products:', error);
        toast.error('Error al cargar productos destacados');
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error('Producto sin stock');
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      quantity: product.unitType === 'PER_KG' ? 0.5 : 1,
      unitType: product.unitType,
      image: product.image || undefined,
    });

    toast.success(`${product.name} agregado al carrito`);
  };

  return (
    <div className="flex flex-col">
      {/* Hero Slider */}
      <section className="relative w-full">
        <HeroSlider />
      </section>

      {/* Quick Links / CTA Below Slider */}
      <section className="w-full py-8 bg-background/95">
        <div className="container mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col items-center text-center space-y-6"
          >
            <h1 className="text-3xl md:text-4xl font-bold">
              Carnicería <span className="text-primary">El Negro</span>
            </h1>
            <p className="max-w-2xl text-lg text-zinc-300">
              La mejor selección de carnes rojas, pollo, embutidos caseros y productos congelados.
              Calidad garantizada y precios que cuidan tu bolsillo.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/ofertas">
                <Button size="lg" className="text-lg px-8 bg-primary hover:bg-primary/90">
                  <Tag className="mr-2 h-5 w-5" />
                  Ver Ofertas
                </Button>
              </Link>
              <Link href="/cortes">
                <Button size="lg" variant="outline" className="text-lg px-8 border-zinc-700 hover:bg-zinc-900">
                  <ChefHat className="mr-2 h-5 w-5" />
                  Ver Cortes de Carne
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section ref={ref3} className="w-full py-16 bg-muted/30">
        <div className="container mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView3 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Star className="h-8 w-8 text-primary" fill="currentColor" />
              <h2 className="text-3xl md:text-4xl font-bold">Productos Destacados</h2>
              <Star className="h-8 w-8 text-primary" fill="currentColor" />
            </div>
            <p className="text-muted-foreground text-lg">
              Nuestros mejores cortes y productos seleccionados especialmente para vos
            </p>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-card rounded-lg border p-4 animate-pulse">
                  <div className="aspect-square bg-muted rounded-lg mb-4" />
                  <div className="h-6 bg-muted rounded mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-card rounded-lg border overflow-hidden hover:shadow-lg transition-shadow group"
                >
                  {/* Product Image */}
                  <div className="relative aspect-square bg-muted">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Beef className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    {/* Featured Badge */}
                    <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                      <Star className="h-3 w-3 mr-1" fill="currentColor" />
                      Destacado
                    </Badge>
                  </div>

                  {/* Product Info */}
                  <div className="p-4 space-y-3">
                    <Link href={`/productos/${product.slug}`}>
                      <h3 className="font-semibold text-lg hover:text-primary transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                    </Link>

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-primary">
                        {formatPrice(product.price)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        / {product.unitType === 'PER_KG' ? 'kg' : 'unidad'}
                      </span>
                    </div>

                    {/* Stock indicator */}
                    {product.stock > 0 && product.stock < 10 && (
                      <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
                        ¡Últimas unidades!
                      </Badge>
                    )}
                    {product.stock === 0 && (
                      <Badge variant="outline" className="text-xs border-red-500 text-red-500">
                        Sin stock
                      </Badge>
                    )}

                    {/* Add to Cart Button */}
                    <Button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className="w-full"
                      size="sm"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Agregar
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!loading && featuredProducts.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <p>No hay productos destacados en este momento</p>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section ref={ref1} className="w-full py-16 bg-background">
        <div className="container mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView1 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Por qué elegirnos?</h2>
            <p className="text-muted-foreground text-lg">
              Más de 7 años brindando calidad y servicio
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features?.map?.((feature, index) => {
              const Icon = feature?.icon;
              return (
                <motion.div
                  key={feature?.title ?? index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.6, delay: (index ?? 0) * 0.1 }}
                  className="flex flex-col items-center text-center p-6 rounded-lg bg-card border shadow-sm hover:shadow-md transition-shadow"
                >
                  {Icon && <Icon className="h-12 w-12 text-primary mb-4" />}
                  <h3 className="text-xl font-semibold mb-2">{feature?.title ?? ''}</h3>
                  <p className="text-muted-foreground">{feature?.description ?? ''}</p>
                </motion.div>
              );
            }) ?? null}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ref2} className="w-full py-16 bg-muted/50">
        <div className="container mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={inView2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-8 md:p-12 text-center border"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pedí ahora y retirá en el día
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Hacé tu pedido online y retiralo en nuestro local o recibirlo en tu domicilio.
              Rápido, fácil y seguro.
            </p>
            <Link href="/productos">
              <Button size="lg" variant="default" className="text-lg px-8">
                Empezar a comprar
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
