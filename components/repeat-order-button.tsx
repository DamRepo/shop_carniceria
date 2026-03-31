"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store";
import { toast } from "sonner";
import { getVatRate } from "@/lib/utils-format";

type RepeatItem = {
  productId: string;
  slug: string | null | undefined;
  quantity: number;
  unitType: "PER_KG" | "PER_UNIT";
  name: string;
};

export function RepeatOrderButton({ items }: { items: RepeatItem[] }) {
  const [loading, setLoading] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const handleRepeat = async () => {
    if (!items.length) return;
    setLoading(true);

    try {
      const withSlugs = items.filter((i) => i.slug);

      const settled = await Promise.allSettled(
        withSlugs.map((i) =>
          fetch(`/api/products/${encodeURIComponent(i.slug!)}`, {
            cache: "no-store",
          })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      );

      const productMap = new Map<string, any>();
      for (const result of settled) {
        if (result.status === "fulfilled" && result.value?.product) {
          const p = result.value.product;
          productMap.set(p.id, p);
        }
      }

      let added = 0;
      const skipped: string[] = [];

      for (const item of items) {
        if (!item.slug) {
          skipped.push(item.name);
          continue;
        }

        const p = productMap.get(item.productId);
        if (!p || !p.isActive || (p.stock ?? 0) <= 0) {
          skipped.push(item.name);
          continue;
        }

        const effectivePrice =
          p.isOnSale && p.salePrice != null && p.salePrice > 0
            ? p.salePrice
            : p.price;

        addItem({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: effectivePrice,
          quantity: item.quantity,
          unitType: p.unitType,
          image: p.image ?? undefined,
          vatRate: getVatRate(p),
        });
        added++;
      }

      if (added > 0 && skipped.length === 0) {
        toast.success(
          `${added} producto${added !== 1 ? "s" : ""} agregado${added !== 1 ? "s" : ""} al carrito`
        );
      } else if (added > 0) {
        toast.success(
          `${added} producto${added !== 1 ? "s" : ""} agregado${added !== 1 ? "s" : ""} al carrito`
        );
        toast.warning(
          `${skipped.length} omitido${skipped.length !== 1 ? "s" : ""} (sin stock o inactivo): ${skipped.join(", ")}`
        );
      } else {
        toast.error("No hay productos disponibles para repetir este pedido.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRepeat}
      disabled={loading}
      type="button"
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Agregando..." : "Repetir pedido"}
    </Button>
  );
}
