'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/product-card';
import { Loader2, ShoppingBasket } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Product, Category } from '@prisma/client';

type ProductWithCategory = Product & {
  category: Category;
};

interface ProductsByCategory {
  despensa: ProductWithCategory[];
  carniceria: ProductWithCategory[];
  bebidas: ProductWithCategory[];
  lacteos: ProductWithCategory[];
}

export default function MinimercadoPage() {
  const [products, setProducts] = useState<ProductsByCategory>({
    despensa: [],
    carniceria: [],
    bebidas: [],
    lacteos: [],
  });
  const [activeTab, setActiveTab] = useState<keyof ProductsByCategory>('despensa');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          
          // Organizar productos por categoría
          const organized: ProductsByCategory = {
            despensa: [],
            carniceria: [],
            bebidas: [],
            lacteos: [],
          };

          data.forEach((product: ProductWithCategory) => {
            const categoryName = product.category?.name?.toLowerCase() || '';
            const productName = product.name?.toLowerCase() || '';

            // Clasificar por categoría
            if (
              categoryName.includes('despensa') ||
              productName.includes('arroz') ||
              productName.includes('fideo') ||
              productName.includes('harina') ||
              productName.includes('azúcar') ||
              productName.includes('sal') ||
              productName.includes('aceite')
            ) {
              organized.despensa.push(product);
            } else if (
              categoryName.includes('carne') ||
              categoryName.includes('embutido') ||
              categoryName.includes('pollo') ||
              productName.includes('chorizo') ||
              productName.includes('salchicha')
            ) {
              organized.carniceria.push(product);
            } else if (
              categoryName.includes('bebida') ||
              productName.includes('agua') ||
              productName.includes('gaseosa') ||
              productName.includes('jugo') ||
              productName.includes('vino') ||
              productName.includes('cerveza')
            ) {
              organized.bebidas.push(product);
            } else if (
              categoryName.includes('lácteo') ||
              categoryName.includes('lacteo') ||
              productName.includes('leche') ||
              productName.includes('yogur') ||
              productName.includes('queso') ||
              productName.includes('manteca')
            ) {
              organized.lacteos.push(product);
            }
          });

          setProducts(organized);
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

  const getTotalCount = () => {
    return Object.values(products).reduce((acc, arr) => acc + arr.length, 0);
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-green-600/10 border border-green-600/20 rounded-full px-6 py-2 mb-4">
          <ShoppingBasket className="h-5 w-5 text-green-600" />
          <span className="text-green-600 font-semibold">Todo en un lugar</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Minimercado</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Además de carnes, encontrá todo lo que necesitás para tu cocina
        </p>
      </div>

      {/* Tabs por categoría */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as keyof ProductsByCategory)} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="despensa" className="text-sm md:text-base">
            Despensa ({products.despensa.length})
          </TabsTrigger>
          <TabsTrigger value="carniceria" className="text-sm md:text-base">
            Carnicería ({products.carniceria.length})
          </TabsTrigger>
          <TabsTrigger value="bebidas" className="text-sm md:text-base">
            Bebidas ({products.bebidas.length})
          </TabsTrigger>
          <TabsTrigger value="lacteos" className="text-sm md:text-base">
            Lácteos ({products.lacteos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="despensa" className="mt-0">
          {products.despensa.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.despensa.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No hay productos disponibles en esta categoría</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="carniceria" className="mt-0">
          {products.carniceria.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.carniceria.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No hay productos disponibles en esta categoría</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="bebidas" className="mt-0">
          {products.bebidas.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.bebidas.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No hay productos disponibles en esta categoría</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="lacteos" className="mt-0">
          {products.lacteos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.lacteos.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No hay productos disponibles en esta categoría</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
