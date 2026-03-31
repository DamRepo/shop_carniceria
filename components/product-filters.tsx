"use client";

import { useState, useEffect, useMemo } from "react";
import { Sliders, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { formatPrice } from "@/lib/utils-format";

/* =========================
   DTO TYPE (sin Prisma)
========================= */

type UnitType = "PER_KG" | "PER_UNIT";

interface ProductDTO {
  id: string;
  price: number;
  salePrice?: number | null;
  isOnSale?: boolean;
  discountPercent?: number | null;
  stock?: number;
  unitType?: UnitType;
  brand?: string | null;
}

export interface FilterOptions {
  minPrice: number;
  maxPrice: number;
  inStockOnly: boolean;
  sortBy:
    | "price-asc"
    | "price-desc"
    | "discount-desc"
    | "name-asc"
    | "name-desc"
    | "recent";
  brand: string | null;
}

interface ProductFiltersProps {
  onFilterChange: (filters: FilterOptions) => void;
  totalProducts: number;
  filteredCount: number;
  allProducts: ProductDTO[];
}

export function ProductFilters({
  onFilterChange,
  totalProducts,
  filteredCount,
  allProducts,
}: ProductFiltersProps) {
  const maxProductPrice = useMemo(() => {
    if (!allProducts.length) return 100_000 * 100;
    return Math.max(...allProducts.map((p) => p.price ?? 0), 100_000 * 100);
  }, [allProducts]);

  const [filters, setFilters] = useState<FilterOptions>({
    minPrice: 0,
    maxPrice: maxProductPrice,
    inStockOnly: false,
    sortBy: "recent",
    brand: null,
  });

  // Actualizar maxPrice cuando carguen los productos
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      maxPrice: maxProductPrice,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxProductPrice]);

  const [sliderValues, setSliderValues] = useState([0, maxProductPrice]);

  // Sync slider when maxProductPrice resolves
  useEffect(() => {
    setSliderValues([0, maxProductPrice]);
  }, [maxProductPrice]);

  // ✅ FIX anti-loop: no depender de onFilterChange
  useEffect(() => {
    onFilterChange(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleSliderChange = (values: number[]) => {
    setSliderValues(values);
    setFilters((prev) => ({
      ...prev,
      minPrice: values[0],
      maxPrice: values[1],
    }));
  };

  const handleReset = () => {
    const resetFilters: FilterOptions = {
      minPrice: 0,
      maxPrice: maxProductPrice,
      inStockOnly: false,
      sortBy: "recent",
      brand: null,
    };
    setFilters(resetFilters);
    setSliderValues([0, maxProductPrice]);
  };

  const isFiltered =
    filters.minPrice > 0 ||
    filters.maxPrice < maxProductPrice ||
    filters.inStockOnly ||
    filters.sortBy !== "recent" ||
    filters.brand !== null;

  const distinctBrands = useMemo(() => {
    const set = new Set<string>();
    allProducts.forEach((p) => { if (p.brand) set.add(p.brand); });
    return Array.from(set).sort();
  }, [allProducts]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sliders className="h-5 w-5" />
          Filtros
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Ordenar por */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Ordenar por</Label>
          <Select
            value={filters.sortBy}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                sortBy: value as FilterOptions["sortBy"],
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Más recientes</SelectItem>
              <SelectItem value="price-asc">Precio: Menor a Mayor</SelectItem>
              <SelectItem value="price-desc">Precio: Mayor a Menor</SelectItem>
              <SelectItem value="discount-desc">Mayor descuento primero</SelectItem>
              <SelectItem value="name-asc">Nombre: A-Z</SelectItem>
              <SelectItem value="name-desc">Nombre: Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Rango de precio — slider */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Rango de precio</Label>

          <Slider
            min={0}
            max={maxProductPrice}
            step={Math.max(1000 * 100, Math.round(maxProductPrice / 100))}
            value={sliderValues}
            onValueChange={handleSliderChange}
            className="mt-2"
          />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatPrice(sliderValues[0])}</span>
            <span>{formatPrice(sliderValues[1])}</span>
          </div>
        </div>

        {/* Marca */}
        {distinctBrands.length > 0 && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">Marca</Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, brand: null }))}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  filters.brand === null
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                Todas
              </button>
              {distinctBrands.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, brand: b }))}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    filters.brand === b
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Disponibilidad */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Disponibilidad</Label>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Solo productos en stock</Label>
            <Switch
              checked={filters.inStockOnly}
              onCheckedChange={(checked) =>
                setFilters((prev) => ({ ...prev, inStockOnly: checked }))
              }
            />
          </div>
        </div>

        <div className="pt-4 border-t text-center text-sm text-muted-foreground">
          Mostrando <strong>{filteredCount}</strong> de{" "}
          <strong>{totalProducts}</strong> productos
        </div>

        {isFiltered && (
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            className="w-full"
            type="button"
          >
            <X className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
