"use client";

import { useEffect, useState } from "react";
import { Star, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";

type UnitType = "PER_KG" | "PER_UNIT";

type CategoryDTO = {
  vatRate?: number | null;
};

type ProductDTO = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  unitType?: UnitType;
  price: number;
  stock: number;
  vatRate?: number | null;
  category?: CategoryDTO | null;
  netWeightGr?: number | null;
  netVolumeMl?: number | null;
  isOnSale?: boolean;
  salePrice?: number | null;
  saleEndDate?: string | null;
  discountPercent?: number | null;
  measurementUnit?: string | null;
  unitMultiplier?: number | null;
};

export default function DestacadosClient() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let alive = true;

    const fetchFeatured = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/products?featured=true", { cache: "no-store" });
        if (!res.ok) throw new Error("Error al cargar destacados");
        const data = (await res.json()) as unknown;
        if (alive) setProducts(Array.isArray(data) ? (data as ProductDTO[]) : []);
      } catch (err) {
        console.error("[DestacadosPage] fetch error:", err);
        if (alive) setError("No pudimos cargar los productos destacados. Intentá de nuevo.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchFeatured();
    return () => {
      alive = false;
    };
  }, [fetchKey]);

  return (
    <div className="w-full">
      <div className="border-b border-border bg-card py-12 sm:py-16">
        <div className="container mx-auto max-w-7xl px-4 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5">
            <Star className="h-4 w-4 text-primary" fill="currentColor" />
            <span className="text-sm font-semibold uppercase tracking-wide text-primary">
              Selección del carnicero
            </span>
          </div>
          <h1 className="font-display text-4xl tracking-wider text-foreground sm:text-5xl">
            Destacados
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Los productos que elegimos resaltar por calidad y demanda.
          </p>
        </div>
      </div>

      <section className="w-full bg-background py-12">
        <div className="container mx-auto max-w-7xl px-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg border bg-card p-4">
                  <div className="mb-4 aspect-square rounded-lg bg-muted" />
                  <div className="mb-2 h-6 rounded bg-muted" />
                  <div className="h-4 w-2/3 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-muted/20 py-16 text-center">
              <AlertTriangle className="h-10 w-10 text-blood" />
              <p className="text-lg font-medium">{error}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFetchKey((k) => k + 1)}
              >
                Reintentar
              </Button>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-muted/20 py-16 text-center text-muted-foreground">
              <p className="font-medium">No hay productos destacados por el momento.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
