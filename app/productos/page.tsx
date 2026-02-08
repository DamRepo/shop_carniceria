"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { ProductFilters, FilterOptions } from "@/components/product-filters";
import { Button } from "@/components/ui/button";
import { Loader2, Filter, ChevronDown, ChevronRight } from "lucide-react";
import type { Product, Category } from "@prisma/client";

type ProductWithCategory = Product & {
  category: Category; // Category incluye parentId
};

type CategoryWithCount = Category & {
  _count?: { products: number };
};

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [allProducts, setAllProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  // Para abrir/cerrar madres en el sidebar
  const [openMothers, setOpenMothers] = useState<Record<string, boolean>>({});

  const [filters, setFilters] = useState<FilterOptions>({
    minPrice: 0,
    maxPrice: 100000 * 100,
    inStockOnly: false,
    sortBy: "recent",
  });

  // ✅ La categoría seleccionada SIEMPRE sale de la URL
  const selectedCategory = (searchParams.get("category") || "todos").trim();

  // -----------------------
  // Cargar categorías (1 vez)
  // -----------------------
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/categories", { cache: "no-store" });
        if (!res.ok) return;

        const data = (await res.json()) as CategoryWithCount[];
        const list = data ?? [];
        setCategories(list);

        // Abrir por defecto todas las madres
        const mothers = list.filter((c) => !c.parentId);
        const initial: Record<string, boolean> = {};
        for (const m of mothers) initial[m.id] = true;
        setOpenMothers(initial);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    })();
  }, []);

  // -----------------------
  // Cargar productos (1 vez) ✅
  // -----------------------
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as ProductWithCategory[];
          setAllProducts(data ?? []);
        } else {
          setAllProducts([]);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Separar madres e hijas
  const mothers = useMemo(() => categories.filter((c) => !c.parentId), [categories]);

  const childrenByMotherId = useMemo(() => {
    const map = new Map<string, CategoryWithCount[]>();
    for (const c of categories) {
      if (!c.parentId) continue;
      const list = map.get(c.parentId) ?? [];
      list.push(c);
      map.set(c.parentId, list);
    }
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
      map.set(k, list);
    }
    return map;
  }, [categories]);

  // Abrir automáticamente la madre cuando la URL apunta a una hija
  useEffect(() => {
    if (!categories.length) return;
    if (!selectedCategory || selectedCategory === "todos") return;

    const selected = categories.find((c) => c.slug === selectedCategory);
    if (selected?.parentId) {
      setOpenMothers((prev) => ({
        ...prev,
        [selected.parentId as string]: true,
      }));
    }
  }, [selectedCategory, categories]);

  // Helpers para navegar (mantener URL sincronizada)
  const goToCategory = (slug: string | "todos") => {
    if (slug === "todos") router.push("/productos");
    else router.push(`/productos?category=${encodeURIComponent(slug)}`);
  };

  const toggleMother = (motherId: string) => {
    setOpenMothers((prev) => ({ ...prev, [motherId]: !prev[motherId] }));
  };

  // -----------------------
  // ✅ Filtrado por categoría (madre incluye hijas)
  // -----------------------
  const categoryFilteredProducts = useMemo(() => {
    if (selectedCategory === "todos") return allProducts;

    const selectedCat = categories.find((c) => c.slug === selectedCategory);

    // Si no existe la categoría en DB, mejor no filtrar (o podrías devolver [])
    if (!selectedCat) return allProducts;

    // Si es madre: traer productos de hijas + (si hubiera) de la madre
    if (!selectedCat.parentId) {
      const motherId = selectedCat.id;
      return allProducts.filter((p) => p.category.id === motherId || p.category.parentId === motherId);
    }

    // Si es hija: traer solo esa hija
    return allProducts.filter((p) => p.category.slug === selectedCategory);
  }, [allProducts, categories, selectedCategory]);

  // Aplicar filtros y ordenamiento
  const filteredProducts = useMemo(() => {
    let result = [...categoryFilteredProducts];

    // Precio
    result = result.filter((product) => {
      const price = product?.price ?? 0;
      return price >= filters.minPrice && price <= filters.maxPrice;
    });

    // Stock
    if (filters.inStockOnly) {
      result = result.filter((product) => (product?.stock ?? 0) > 0);
    }

    // Orden
    switch (filters.sortBy) {
      case "price-asc":
        result.sort((a, b) => (a?.price ?? 0) - (b?.price ?? 0));
        break;
      case "price-desc":
        result.sort((a, b) => (b?.price ?? 0) - (a?.price ?? 0));
        break;
      case "name-asc":
        result.sort((a, b) => (a?.name ?? "").localeCompare(b?.name ?? ""));
        break;
      case "name-desc":
        result.sort((a, b) => (b?.name ?? "").localeCompare(a?.name ?? ""));
        break;
      case "recent":
        result.sort((a, b) => {
          const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        break;
    }

    return result;
  }, [categoryFilteredProducts, filters]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Nuestros Productos</h1>
        <p className="text-muted-foreground text-lg">Explorá nuestra selección de carnes, embutidos y más</p>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Categorías */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Categorías</h2>
            </div>

            <div className="flex flex-col gap-2 max-h-[55vh] overflow-auto pr-1">
              <Button
                className="justify-between"
                variant={selectedCategory === "todos" ? "default" : "outline"}
                onClick={() => goToCategory("todos")}
              >
                <span>Todos</span>
              </Button>

              {/* Madres + Hijas */}
              {mothers.map((mother) => {
                const children = childrenByMotherId.get(mother.id) ?? [];
                const isOpen = !!openMothers[mother.id];

                // (Opcional) marcar madre activa cuando la URL apunta a esa madre
                const motherIsActive = selectedCategory === mother.slug;

                return (
                  <div key={mother.id} className="mt-2">
                    {/* Madre (título + colapsar) */}
                    <button
                      type="button"
                      onClick={() => {
                        toggleMother(mother.id);
                        // ✅ Si querés que click en madre filtre (como tu menú superior)
                        // descomentá esta línea:
                        // goToCategory(mother.slug);
                      }}
                      className={[
                        "w-full flex items-center justify-between rounded-md px-2 py-2 text-left text-sm font-semibold hover:bg-zinc-800/60",
                        motherIsActive ? "bg-red-500/10 text-red-400" : "text-zinc-100",
                      ].join(" ")}
                    >
                      <span className="truncate">{mother.name}</span>
                      <span className="flex items-center gap-2 text-xs text-zinc-400">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </span>
                    </button>

                    {/* Hijas (botones) */}
                    {isOpen && (
                      <div className="mt-2 flex flex-col gap-2 pl-2">
                        {children.length === 0 ? (
                          <div className="text-xs text-zinc-500 px-2">(Sin subcategorías)</div>
                        ) : (
                          children.map((child) => (
                            <Button
                              key={child.id}
                              className="justify-between"
                              variant={selectedCategory === child.slug ? "default" : "outline"}
                              onClick={() => goToCategory(child.slug)}
                            >
                              <span className="truncate">{child.name}</span>
                              <span className="ml-2 text-xs opacity-70">({child._count?.products ?? 0})</span>
                            </Button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filtros */}
          <ProductFilters
            onFilterChange={setFilters}
            totalProducts={categoryFilteredProducts.length}
            filteredCount={filteredProducts.length}
            allProducts={categoryFilteredProducts}
          />
        </div>

        {/* Productos */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">
                {categoryFilteredProducts.length === 0
                  ? "No se encontraron productos en esta categoría"
                  : "No se encontraron productos con los filtros aplicados"}
              </p>
              <p className="text-muted-foreground text-sm mt-2">Intentá ajustar los filtros para ver más resultados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
