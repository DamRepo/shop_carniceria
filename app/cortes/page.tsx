'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/product-card';
import { Loader2, ChefHat } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Product, Category } from '@prisma/client';

type ProductWithCategory = Product & {
  category: Category;
};

interface ProductsByType {
  vacuna: ProductWithCategory[];
  pollo: ProductWithCategory[];
  cerdo: ProductWithCategory[];
  otros: ProductWithCategory[];
}

export default function CortesPage() {
  const [products, setProducts] = useState<ProductsByType>({
    vacuna: [],
    pollo: [],
    cerdo: [],
    otros: [],
  });
  const [activeTab, setActiveTab] = useState<keyof ProductsByType>('vacuna');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          
          // Organizar productos por tipo
          const organized: ProductsByType = {
            vacuna: [],
            pollo: [],
            cerdo: [],
            otros: [],
          };

          data.forEach((product: ProductWithCategory) => {
            const categoryName = product.category?.name?.toLowerCase() || '';
            const productName = product.name?.toLowerCase() || '';

            // Clasificar por tipo de carne
            if (
              categoryName.includes('carne') || 
              categoryName.includes('vacuna') ||
              categoryName.includes('rojas') ||
              productName.includes('asado') ||
              productName.includes('bife') ||
              productName.includes('vacío') ||
              productName.includes('costilla') ||
              productName.includes('lomo') ||
              productName.includes('nalga') ||
              productName.includes('cuadril') ||
              productName.includes('entraña')
            ) {
              organized.vacuna.push(product);
            } else if (
              categoryName.includes('pollo') || 
              productName.includes('pollo') ||
              productName.includes('pechuga') ||
              productName.includes('muslo')
            ) {
              organized.pollo.push(product);
            } else if (
              categoryName.includes('cerdo') || 
              productName.includes('cerdo') ||
              productName.includes('costilla de cerdo') ||
              productName.includes('chuleta')
            ) {
              organized.cerdo.push(product);
            } else if (
              categoryName.includes('embutido') ||
              categoryName.includes('chorizo') ||
              categoryName.includes('salchicha')
            ) {
              // No incluir embutidos en cortes
            } else {
              // Otros cortes no clasificados
              organized.otros.push(product);
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
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-6 py-2 mb-4">
          <ChefHat className="h-5 w-5 text-primary" />
          <span className="text-primary font-semibold">Cortes Premium</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Nuestros Cortes</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Seleccionamos los mejores cortes para vos. Calidad garantizada.
        </p>
      </div>

      {/* Tabs por tipo de carne */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as keyof ProductsByType)} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="vacuna" className="text-sm md:text-base">
            Vacuna ({products.vacuna.length})
          </TabsTrigger>
          <TabsTrigger value="pollo" className="text-sm md:text-base">
            Pollo ({products.pollo.length})
          </TabsTrigger>
          <TabsTrigger value="cerdo" className="text-sm md:text-base">
            Cerdo ({products.cerdo.length})
          </TabsTrigger>
          <TabsTrigger value="otros" className="text-sm md:text-base">
            Otros ({products.otros.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vacuna" className="mt-0">
          {products.vacuna.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.vacuna.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No hay productos disponibles en esta categoría</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pollo" className="mt-0">
          {products.pollo.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.pollo.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No hay productos disponibles en esta categoría</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="cerdo" className="mt-0">
          {products.cerdo.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.cerdo.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No hay productos disponibles en esta categoría</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="otros" className="mt-0">
          {products.otros.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.otros.map((product) => (
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
