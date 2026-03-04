"use client";

import { useState, useEffect, useMemo } from "react";
import { Sliders, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

/* =========================
   DTO TYPE (sin Prisma)
========================= */

type UnitType = "PER_KG" | "PER_UNIT";

interface ProductDTO {
  id: string;
  price: number;
  salePrice?: number | null;
  isOnSale?: boolean;
  stock?: number;
  unitType?: UnitType;
}

export interface FilterOptions {
  minPrice: number;
  maxPrice: number;
  inStockOnly: boolean;
  sortBy: "price-asc" | "price-desc" | "name-asc" | "name-desc" | "recent";
}

interface PriceRange {
  label: string;
  min: number;
  max: number;
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
  const [filters, setFilters] = useState<FilterOptions>({
    minPrice: 0,
    maxPrice: 100000 * 100,
    inStockOnly: false,
    sortBy: "recent",
  });

  const [tempMinPrice, setTempMinPrice] = useState("");
  const [tempMaxPrice, setTempMaxPrice] = useState("");
  const [selectedRange, setSelectedRange] = useState<string | null>(null);

  const priceRanges: PriceRange[] = [
    { label: "Hasta $10.000", min: 0, max: 10000 * 100 },
    { label: "$10.000 a $30.000", min: 10000 * 100, max: 30000 * 100 },
    { label: "$30.000 a $50.000", min: 30000 * 100, max: 50000 * 100 },
    { label: "Más de $50.000", min: 50000 * 100, max: 100000 * 100 },
  ];

  const rangeCounts = useMemo(() => {
    return priceRanges.map((range) => {
      return allProducts.filter((product) => {
        const productPrice =
          product.isOnSale && product.salePrice ? product.salePrice : product.price;

        return productPrice >= range.min && productPrice <= range.max;
      }).length;
    });
  }, [allProducts, priceRanges]);

  // ✅ FIX anti-loop: no depender de onFilterChange
  useEffect(() => {
    onFilterChange(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handlePriceRangeClick = (range: PriceRange) => {
    setSelectedRange(range.label);
    setFilters((prev) => ({
      ...prev,
      minPrice: range.min,
      maxPrice: range.max,
    }));
    setTempMinPrice("");
    setTempMaxPrice("");
  };

  const handleApplyPriceFilter = () => {
    const min = tempMinPrice ? parseFloat(tempMinPrice) * 100 : 0;
    const max = tempMaxPrice ? parseFloat(tempMaxPrice) * 100 : 100000 * 100;

    setSelectedRange(null);
    setFilters((prev) => ({
      ...prev,
      minPrice: min,
      maxPrice: max,
    }));
  };

  const handleReset = () => {
    setFilters({
      minPrice: 0,
      maxPrice: 100000 * 100,
      inStockOnly: false,
      sortBy: "recent",
    });
    setTempMinPrice("");
    setTempMaxPrice("");
    setSelectedRange(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sliders className="h-5 w-5" />
          Filtros
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Precio */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Precio</Label>

          <div className="space-y-1">
            {priceRanges.map((range, index) => (
              <button
                key={range.label}
                onClick={() => handlePriceRangeClick(range)}
                className={`w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 transition-colors flex items-center justify-between ${
                  selectedRange === range.label ? "bg-muted" : ""
                }`}
                type="button"
              >
                <span className="text-sm">{range.label}</span>
                <span className="text-xs text-muted-foreground">
                  ({rangeCounts[index]})
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Mínimo"
                value={tempMinPrice}
                onChange={(e) => {
                  setTempMinPrice(e.target.value);
                  setSelectedRange(null);
                }}
              />
              <Input
                type="number"
                placeholder="Máximo"
                value={tempMaxPrice}
                onChange={(e) => {
                  setTempMaxPrice(e.target.value);
                  setSelectedRange(null);
                }}
              />
            </div>

            <Button
              onClick={handleApplyPriceFilter}
              className="w-full"
              variant="secondary"
              size="sm"
              type="button"
            >
              <ChevronRight className="mr-1 h-4 w-4" />
              Aplicar rango
            </Button>
          </div>
        </div>

        {/* Stock */}
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

        {/* Orden */}
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
              <SelectItem value="name-asc">Nombre: A-Z</SelectItem>
              <SelectItem value="name-desc">Nombre: Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4 border-t text-center text-sm text-muted-foreground">
          Mostrando <strong>{filteredCount}</strong> de{" "}
          <strong>{totalProducts}</strong> productos
        </div>

        <Button onClick={handleReset} variant="outline" size="sm" className="w-full" type="button">
          <X className="mr-2 h-4 w-4" />
          Limpiar filtros
        </Button>
      </CardContent>
    </Card>
  );
}