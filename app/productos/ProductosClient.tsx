"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { ProductFilters, FilterOptions } from "@/components/product-filters";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Loader2,
  Filter,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";

/* =======================
   DTO TYPES (sin Prisma)
======================= */

type UnitType = "PER_KG" | "PER_UNIT";

type CategoryDTO = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  _count?: { products: number };
};

type ProductWithCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;

  unitType: UnitType;
  price: number;
  stock: number;

  isActive: boolean;
  isFeatured: boolean;
  isOnSale: boolean;
  salePrice?: number | null;
  saleEndDate?: string | null;
  discountPercent?: number | null;

  createdAt?: string;

  categoryId: string;
  category: CategoryDTO;
};

type CategoryWithCount = CategoryDTO;

export default function ProductosClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [allProducts, setAllProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  const [openMothers, setOpenMothers] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);

  const [filters, setFilters] = useState<FilterOptions>({
    minPrice: 0,
    maxPrice: 100000 * 100,
    inStockOnly: false,
    sortBy: "recent",
  });

  const selectedCategory = (searchParams.get("category") || "todos").trim();

  /* -----------------------
     Cargar categorías
  ----------------------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/categories", { cache: "no-store" });
        if (!res.ok) return;

        const data = (await res.json()) as CategoryWithCount[];
        const list = data ?? [];
        setCategories(list);

        const mothers = list.filter((c) => !c.parentId);
        const initial: Record<string, boolean> = {};
        for (const m of mothers) initial[m.id] = true;
        setOpenMothers(initial);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    })();
  }, []);

  /* -----------------------
     Cargar productos
  ----------------------- */
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

  const mothers = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories]
  );

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

  const goToCategory = (slug: string | "todos") => {
    if (slug === "todos") router.push("/productos");
    else router.push(`/productos?category=${encodeURIComponent(slug)}`);
  };

  const goToCategoryMobile = (slug: string | "todos") => {
    goToCategory(slug);
    setMobileOpen(false);
  };

  const toggleMother = (motherId: string) => {
    setOpenMothers((prev) => ({ ...prev, [motherId]: !prev[motherId] }));
  };

  /* -----------------------
     Filtrado por categoría
  ----------------------- */
  const categoryFilteredProducts = useMemo(() => {
    if (selectedCategory === "todos") return allProducts;

    const selectedCat = categories.find((c) => c.slug === selectedCategory);
    if (!selectedCat) return allProducts;

    if (!selectedCat.parentId) {
      const motherId = selectedCat.id;
      return allProducts.filter(
        (p) => p.category.id === motherId || p.category.parentId === motherId
      );
    }

    return allProducts.filter((p) => p.category.slug === selectedCategory);
  }, [allProducts, categories, selectedCategory]);

  /* -----------------------
     Recibir filtros del hijo (estable + anti-loop)
  ----------------------- */
  const handleFilterChange = useCallback((next: FilterOptions) => {
    setFilters((prev) => {
      const same =
        prev.minPrice === next.minPrice &&
        prev.maxPrice === next.maxPrice &&
        prev.inStockOnly === next.inStockOnly &&
        prev.sortBy === next.sortBy;

      return same ? prev : next;
    });
  }, []);

  /* -----------------------
     Aplicar filtros
  ----------------------- */
  const filteredProducts = useMemo(() => {
    let result = [...categoryFilteredProducts];

    result = result.filter((product) => {
      const price = product?.price ?? 0;
      return price >= filters.minPrice && price <= filters.maxPrice;
    });

    if (filters.inStockOnly) {
      result = result.filter((product) => (product?.stock ?? 0) > 0);
    }

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

  const CategoriesBlock = ({ mobile }: { mobile: boolean }) => (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Categorías</h2>
      </div>

      <div className={mobile ? "flex flex-col gap-2" : "flex flex-col gap-2 max-h-[55vh] overflow-auto pr-1"}>
        <Button
          className="justify-between"
          variant={selectedCategory === "todos" ? "default" : "outline"}
          onClick={() => (mobile ? goToCategoryMobile("todos") : goToCategory("todos"))}
        >
          <span>Todos</span>
        </Button>

        {mothers.map((mother) => {
          const children = childrenByMotherId.get(mother.id) ?? [];
          const isOpen = !!openMothers[mother.id];
          const motherIsActive = selectedCategory === mother.slug;

          return (
            <div key={mother.id} className="mt-2">
              <button
                type="button"
                onClick={() => toggleMother(mother.id)}
                className={[
                  "w-full flex items-center justify-between rounded-md px-2 py-2 text-left text-sm font-semibold hover:bg-zinc-800/60",
                  motherIsActive ? "bg-red-500/10 text-red-400" : "text-zinc-100",
                ].join(" ")}
              >
                <span className="truncate">{mother.name}</span>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

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
                        onClick={() =>
                          mobile ? goToCategoryMobile(child.slug) : goToCategory(child.slug)
                        }
                      >
                        <span className="truncate">{child.name}</span>
                        <span className="ml-2 text-xs opacity-70">
                          ({child._count?.products ?? 0})
                        </span>
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
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold mb-2">Nuestros Productos</h1>
        <p className="text-muted-foreground text-sm sm:text-lg">
          Explorá nuestra selección de carnes, embutidos y más
        </p>
      </div>

      {/* MOBILE: botón que abre todo */}
      <div className="lg:hidden mb-4">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros y Categorías
              <span className="ml-2 text-xs opacity-70">
                ({filteredProducts.length}/{categoryFilteredProducts.length})
              </span>
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-80 bg-zinc-950 border-zinc-800 p-0">
            <div className="flex h-full flex-col">
              <div className="p-4 border-b border-zinc-800">
                <div className="text-base font-semibold text-white">Filtros y Categorías</div>
                <p className="text-xs text-zinc-400 mt-1">
                  Elegí categoría y ajustá filtros. Luego tocá “Aplicar”.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <CategoriesBlock mobile />
                {/* Mobile usa filtros sin Sheet interno (para evitar Sheet anidado) */}
                <ProductFilters
                  onFilterChange={handleFilterChange}
                  totalProducts={categoryFilteredProducts.length}
                  filteredCount={filteredProducts.length}
                  allProducts={categoryFilteredProducts}
                />
              </div>

              <div className="p-4 border-t border-zinc-800">
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* DESKTOP */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="hidden lg:block lg:col-span-1 space-y-6">
          <CategoriesBlock mobile={false} />
          <ProductFilters
            onFilterChange={handleFilterChange}
            totalProducts={categoryFilteredProducts.length}
            filteredCount={filteredProducts.length}
            allProducts={categoryFilteredProducts}
          />
        </div>

        <div className="lg:col-span-3 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product as any} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">
                {categoryFilteredProducts.length === 0
                  ? "No se encontraron productos en esta categoría"
                  : "No se encontraron productos con los filtros aplicados"}
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Intentá ajustar los filtros
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}