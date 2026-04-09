"use client";

import { useCallback, useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ProductFilters, FilterOptions } from "@/components/product-filters";

type CategoryDTO = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
};

type ProductDTO = {
  id: string;
  price: number;
  salePrice?: number | null;
  isOnSale?: boolean;
  discountPercent?: number | null;
  stock?: number;
  brand?: string | null;
  category?: CategoryDTO;
};

type Props = {
  allProducts: ProductDTO[];
  label?: string;
  children: (filtered: ProductDTO[], filters: FilterOptions) => React.ReactNode;
};

const DEFAULT_FILTERS: FilterOptions = {
  minPrice: 0,
  maxPrice: 100_000 * 100,
  inStockOnly: false,
  sortBy: "recent",
  brand: null,
};

export function CategoryFilterBar({ allProducts, label, children }: Props) {
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleFilterChange = useCallback((next: FilterOptions) => {
    setFilters((prev) => {
      const same =
        prev.minPrice === next.minPrice &&
        prev.maxPrice === next.maxPrice &&
        prev.inStockOnly === next.inStockOnly &&
        prev.sortBy === next.sortBy &&
        prev.brand === next.brand;
      return same ? prev : next;
    });
  }, []);

  // Extract unique categories from products
  const categories = useMemo(() => {
    const map = new Map<string, CategoryDTO>();
    for (const p of allProducts) {
      if (p.category && !map.has(p.category.slug)) {
        map.set(p.category.slug, p.category);
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? "")
    );
  }, [allProducts]);

  const showCategoryFilter = categories.length > 1;

  // Category-filtered slice (before price/brand/sort)
  const categoryFiltered = useMemo(() => {
    if (!selectedCategorySlug) return allProducts;
    return allProducts.filter(
      (p) => p.category?.slug === selectedCategorySlug
    );
  }, [allProducts, selectedCategorySlug]);

  const filtered = useMemo(() => {
    let result = [...categoryFiltered];

    result = result.filter(
      (p) => (p.price ?? 0) >= filters.minPrice && (p.price ?? 0) <= filters.maxPrice
    );

    if (filters.inStockOnly) {
      result = result.filter((p) => (p.stock ?? 0) > 0);
    }

    if (filters.brand) {
      result = result.filter((p: any) => p.brand === filters.brand);
    }

    switch (filters.sortBy) {
      case "price-asc":
        result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case "price-desc":
        result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case "discount-desc":
        result.sort((a, b) => {
          const discA =
            a.isOnSale && a.salePrice != null && (a.price ?? 0) > 0
              ? ((a.price - a.salePrice) / a.price) * 100
              : (a.discountPercent ?? 0);
          const discB =
            b.isOnSale && b.salePrice != null && (b.price ?? 0) > 0
              ? ((b.price - b.salePrice) / b.price) * 100
              : (b.discountPercent ?? 0);
          return discB - discA;
        });
        break;
      case "name-asc":
        result.sort((a: any, b: any) =>
          (a.name ?? "").localeCompare(b.name ?? "")
        );
        break;
      case "name-desc":
        result.sort((a: any, b: any) =>
          (b.name ?? "").localeCompare(a.name ?? "")
        );
        break;
    }

    return result;
  }, [categoryFiltered, filters]);

  const CategoryBlock = () =>
    showCategoryFilter ? (
      <div className="mb-4">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setSelectedCategorySlug(null)}
            className={[
              "text-left text-sm px-3 py-1.5 rounded-md transition-colors",
              selectedCategorySlug === null
                ? "bg-primary text-primary-foreground font-medium"
                : "hover:bg-muted text-muted-foreground",
            ].join(" ")}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() =>
                setSelectedCategorySlug(
                  selectedCategorySlug === cat.slug ? null : cat.slug
                )
              }
              className={[
                "text-left text-sm px-3 py-1.5 rounded-md transition-colors",
                selectedCategorySlug === cat.slug
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-muted text-muted-foreground",
              ].join(" ")}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  const activeFiltersCount =
    (selectedCategorySlug ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0) +
    (filters.brand ? 1 : 0) +
    (filters.minPrice > 0 || filters.maxPrice < 100_000 * 100 ? 1 : 0);

  return (
    <>
      {/* Mobile: botón filtros */}
      <div className="lg:hidden mb-4">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
              <span className="ml-2 text-xs opacity-70">
                ({filtered.length}/{allProducts.length})
              </span>
            </Button>
          </SheetTrigger>

          <SheetContent
            side="left"
            className="w-80 bg-zinc-950 border-zinc-800 p-0"
          >
            <div className="flex h-full flex-col">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  {label && (
                    <div className="text-base font-semibold text-white leading-tight">
                      {label}
                    </div>
                  )}
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
                  </div>
                </div>
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategorySlug(null);
                      setFilters(DEFAULT_FILTERS);
                    }}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Limpiar
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <CategoryBlock />
                <ProductFilters
                  onFilterChange={handleFilterChange}
                  totalProducts={categoryFiltered.length}
                  filteredCount={filtered.length}
                  allProducts={categoryFiltered}
                />
              </div>
              <div className="p-4 border-t border-zinc-800">
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  Ver {filtered.length} productos
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: sidebar + contenido */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="hidden lg:block lg:col-span-1">
          {label && (
            <div className="mb-4 pb-3 border-b flex items-center justify-between">
              <div>
                <p className="text-base font-semibold leading-tight">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
                </p>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategorySlug(null);
                    setFilters(DEFAULT_FILTERS);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Limpiar
                </button>
              )}
            </div>
          )}
          <CategoryBlock />
          <ProductFilters
            onFilterChange={handleFilterChange}
            totalProducts={categoryFiltered.length}
            filteredCount={filtered.length}
            allProducts={categoryFiltered}
          />
        </div>

        <div className="lg:col-span-3">
          {children(filtered as any[], filters)}
        </div>
      </div>
    </>
  );
}
