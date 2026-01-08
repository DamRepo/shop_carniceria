'use client';

import { useEffect, useState, useMemo } from 'react';
import { ProductCard } from '@/components/product-card';
import { ProductFilters, FilterOptions } from '@/components/product-filters';
import { Button } from '@/components/ui/button';
import { Loader2, Filter } from 'lucide-react';
import type { Product, Category } from '@prisma/client';

type ProductWithCategory = Product & {
  category: Category;
};

export default function ProductsPage() {
  const [allProducts, setAllProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<(Category & { _count: { products: number } })[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    minPrice: 0,
    maxPrice: 100000 * 100,
    inStockOnly: false,
    sortBy: 'recent',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res?.ok) {
        const data = await res?.json?.();
        setCategories(data ?? []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const url = selectedCategory && selectedCategory !== 'todos'
        ? `/api/products?category=${selectedCategory}`
        : '/api/products';
      const res = await fetch(url);
      if (res?.ok) {
        const data = await res?.json?.();
        setAllProducts(data ?? []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros y ordenamiento
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Filtrar por rango de precio
    result = result.filter(product => {
      const price = product?.price ?? 0;
      return price >= filters.minPrice && price <= filters.maxPrice;
    });

    // Filtrar por disponibilidad
    if (filters.inStockOnly) {
      result = result.filter(product => (product?.stock ?? 0) > 0);
    }

    // Ordenar
    switch (filters.sortBy) {
      case 'price-asc':
        result.sort((a, b) => (a?.price ?? 0) - (b?.price ?? 0));
        break;
      case 'price-desc':
        result.sort((a, b) => (b?.price ?? 0) - (a?.price ?? 0));
        break;
      case 'name-asc':
        result.sort((a, b) => (a?.name ?? '').localeCompare(b?.name ?? ''));
        break;
      case 'name-desc':
        result.sort((a, b) => (b?.name ?? '').localeCompare(a?.name ?? ''));
        break;
      case 'recent':
        result.sort((a, b) => {
          const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        break;
    }

    return result;
  }, [allProducts, filters]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Nuestros Productos</h1>
        <p className="text-muted-foreground text-lg">
          Explorá nuestra selección de carnes, embutidos y más
        </p>
      </div>

      {/* Filtros por categoría */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Categorías</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'todos' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('todos')}
          >
            Todos
          </Button>
          {categories?.map?.((category) => (
            <Button
              key={category?.id ?? ''}
              variant={selectedCategory === (category?.slug ?? '') ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category?.slug ?? '')}
            >
              {category?.name ?? ''}
              <span className="ml-2 text-xs opacity-70">({category?._count?.products ?? 0})</span>
            </Button>
          )) ?? null}
        </div>
      </div>

      {/* Layout con Filtros y Productos */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de filtros (Desktop) */}
        <div className="lg:col-span-1">
          <ProductFilters
            onFilterChange={setFilters}
            totalProducts={allProducts.length}
            filteredCount={filteredProducts.length}
            allProducts={allProducts}
          />
        </div>

        {/* Lista de productos */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (filteredProducts?.length ?? 0) > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts?.map?.((product) => (
                <ProductCard key={product?.id ?? ''} product={product} />
              )) ?? null}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">
                {allProducts.length === 0 
                  ? 'No se encontraron productos en esta categoría'
                  : 'No se encontraron productos con los filtros aplicados'}
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Intentá ajustar los filtros para ver más resultados
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
