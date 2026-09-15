"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils-format";

interface ComboItemDTO {
  id: string;
  productId: string;
  quantity: number;
  product: { id: string; name: string; slug: string; image: string | null; price: number };
}

interface ComboDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  stock: number;
  finalPriceCents: number;
  savingsCents: number;
  items: ComboItemDTO[];
}

export function HomeCombosSection() {
  const [combos, setCombos] = useState<ComboDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCombos() {
      try {
        const res = await fetch("/api/combos");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setCombos(data);
      } catch {
        // Silenciar: la sección simplemente no se muestra si falla el fetch.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCombos();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || combos.length === 0) return null;

  return (
    <section className="w-full bg-background py-8 sm:py-16">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
          <div className="lg:w-1/4 lg:shrink-0">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Tag className="h-6 w-6" />
            </div>
            <h2 className="font-display text-3xl tracking-wider text-foreground sm:text-4xl">
              COMBOS PARA EL FINDE
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Todo lo que necesitás, en un solo clic.
            </p>
            <div className="mt-4">
              <Link href="/productos">
                <Button variant="outline" className="border-border bg-card text-foreground hover:bg-muted">
                  Ver todos los combos →
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
            {combos.map((combo) => {
              const agotado = combo.stock <= 0;

              return (
                <div
                  key={combo.id}
                  className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm"
                >
                  {agotado ? (
                    <Badge className="absolute right-3 top-3 z-10 bg-blood hover:bg-blood-dark text-white text-[11px] px-2 py-0.5 rounded-none">
                      Agotado
                    </Badge>
                  ) : combo.savingsCents > 0 ? (
                    <span className="absolute right-3 top-3 z-10 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                      Ahorrás {formatPrice(combo.savingsCents)}
                    </span>
                  ) : null}

                  <div className="relative aspect-[4/3] bg-muted">
                    {combo.imageUrl ? (
                      <Image
                        src={combo.imageUrl}
                        alt={combo.name}
                        fill
                        sizes="(min-width: 640px) 20vw, 90vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <ShoppingCart className="h-10 w-10" />
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-foreground">{combo.name}</h3>
                    <ul className="mt-1 text-xs text-muted-foreground">
                      {combo.items.map((item) => (
                        <li key={item.id}>
                          {item.quantity} x {item.product.name}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-lg font-bold text-foreground">
                        {formatPrice(combo.finalPriceCents)}
                      </span>
                      <Link href="/productos">
                        <Button size="sm" className="gap-1.5" disabled={agotado}>
                          <ShoppingCart className="h-4 w-4" />
                          Agregar
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
