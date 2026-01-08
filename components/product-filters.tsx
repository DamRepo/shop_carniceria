'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sliders, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { formatPrice } from '@/lib/utils-format';
import type { Product } from '@prisma/client';

export interface FilterOptions {
  minPrice: number;
  maxPrice: number;
  inStockOnly: boolean;
  sortBy: 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'recent';
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
  allProducts: Product[];
}

export function ProductFilters({ onFilterChange, totalProducts, filteredCount, allProducts }: ProductFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    minPrice: 0,
    maxPrice: 100000 * 100, // 100,000 pesos en centavos
    inStockOnly: false,
    sortBy: 'recent',
  });

  const [tempMinPrice, setTempMinPrice] = useState('');
  const [tempMaxPrice, setTempMaxPrice] = useState('');
  const [selectedRange, setSelectedRange] = useState<string | null>(null);

  // Definir rangos de precio predefinidos (en centavos)
  const priceRanges: PriceRange[] = [
    { label: 'Hasta $10.000', min: 0, max: 10000 * 100 },
    { label: '$10.000 a $30.000', min: 10000 * 100, max: 30000 * 100 },
    { label: '$30.000 a $50.000', min: 30000 * 100, max: 50000 * 100 },
    { label: 'Más de $50.000', min: 50000 * 100, max: 100000 * 100 },
  ];

  // Calcular el conteo de productos en cada rango
  const rangeCounts = useMemo(() => {
    return priceRanges.map(range => {
      const count = allProducts.filter(product => {
        const productPrice = product.isOnSale && product.salePrice ? product.salePrice : product.price;
        return productPrice >= range.min && productPrice <= range.max;
      }).length;
      return count;
    });
  }, [allProducts]);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters]);

  const handlePriceRangeClick = (range: PriceRange, index: number) => {
    setSelectedRange(range.label);
    setFilters(prev => ({
      ...prev,
      minPrice: range.min,
      maxPrice: range.max,
    }));
    setTempMinPrice('');
    setTempMaxPrice('');
  };

  const handleApplyPriceFilter = () => {
    const min = tempMinPrice ? parseFloat(tempMinPrice) * 100 : 0;
    const max = tempMaxPrice ? parseFloat(tempMaxPrice) * 100 : 100000 * 100;
    
    setSelectedRange(null);
    setFilters(prev => ({
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
      sortBy: 'recent',
    });
    setTempMinPrice('');
    setTempMaxPrice('');
    setSelectedRange(null);
  };

  const FiltersContent = () => (
    <div className="space-y-6">
      {/* Filtro de precio */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Precio</Label>
        
        {/* Rangos predefinidos */}
        <div className="space-y-1">
          {priceRanges.map((range, index) => (
            <button
              key={range.label}
              onClick={() => handlePriceRangeClick(range, index)}
              className={`w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 transition-colors flex items-center justify-between group ${
                selectedRange === range.label ? 'bg-muted' : ''
              }`}
            >
              <span className={`text-sm ${selectedRange === range.label ? 'font-medium text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                {range.label}
              </span>
              <span className={`text-xs ${selectedRange === range.label ? 'text-primary' : 'text-muted-foreground/60 group-hover:text-muted-foreground'}`}>
                ({rangeCounts[index]})
              </span>
            </button>
          ))}
        </div>

        {/* Separador */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              o personalizado
            </span>
          </div>
        </div>

        {/* Inputs personalizados */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Label htmlFor="min-price" className="text-xs text-muted-foreground">Mínimo</Label>
              <Input
                id="min-price"
                type="number"
                placeholder="$0"
                value={tempMinPrice}
                onChange={(e) => {
                  setTempMinPrice(e.target.value);
                  setSelectedRange(null);
                }}
                min="0"
                step="1000"
              />
            </div>
            <span className="text-muted-foreground mt-5">-</span>
            <div className="flex-1">
              <Label htmlFor="max-price" className="text-xs text-muted-foreground">Máximo</Label>
              <Input
                id="max-price"
                type="number"
                placeholder="$100.000"
                value={tempMaxPrice}
                onChange={(e) => {
                  setTempMaxPrice(e.target.value);
                  setSelectedRange(null);
                }}
                min="0"
                step="1000"
              />
            </div>
          </div>
          <Button 
            onClick={handleApplyPriceFilter} 
            className="w-full" 
            variant="secondary"
            size="sm"
          >
            <ChevronRight className="mr-1 h-4 w-4" />
            Aplicar rango
          </Button>
        </div>
      </div>

      {/* Filtro de disponibilidad */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Disponibilidad</Label>
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="stock-filter" className="text-sm">
            Solo productos en stock
          </Label>
          <Switch
            id="stock-filter"
            checked={filters.inStockOnly}
            onCheckedChange={(checked) => 
              setFilters(prev => ({ ...prev, inStockOnly: checked }))
            }
          />
        </div>
      </div>

      {/* Ordenamiento */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Ordenar por</Label>
        <Select
          value={filters.sortBy}
          onValueChange={(value) => 
            setFilters(prev => ({ ...prev, sortBy: value as FilterOptions['sortBy'] }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar orden" />
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

      {/* Resumen de resultados */}
      <div className="pt-4 border-t">
        <p className="text-sm text-muted-foreground text-center">
          Mostrando <span className="font-semibold text-foreground">{filteredCount}</span> de{' '}
          <span className="font-semibold text-foreground">{totalProducts}</span> productos
        </p>
      </div>

      {/* Botón de resetear */}
      <Button 
        onClick={handleReset} 
        variant="outline" 
        className="w-full"
        size="sm"
      >
        <X className="mr-2 h-4 w-4" />
        Limpiar filtros
      </Button>
    </div>
  );

  return (
    <>
      {/* Vista Desktop */}
      <div className="hidden lg:block">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FiltersContent />
          </CardContent>
        </Card>
      </div>

      {/* Vista Mobile */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <Sliders className="mr-2 h-4 w-4" />
              Filtros y Ordenar
              {filteredCount !== totalProducts && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                  {filteredCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FiltersContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
