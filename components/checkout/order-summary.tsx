"use client";

import { ShoppingCart, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice, formatQuantity, netFromGrossCents } from "@/lib/utils-format";

type CartItem = {
  id: string;
  name?: string | null;
  price?: number | null;
  quantity?: number | null;
  unitType?: "PER_KG" | "PER_UNIT" | null;
  vatRate?: number | null;
};

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  subtotalNet: number;
  total: number;
}

export function OrderSummary({
  items,
  subtotal,
  subtotalNet,
  total,
}: OrderSummaryProps) {
  return (
    <Card className="overflow-hidden rounded-3xl border-border/60 shadow-sm">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShoppingCart className="h-5 w-5" />
          </div>

          <div>
            <CardTitle className="text-xl">Resumen del pedido</CardTitle>
            <p className="text-sm text-muted-foreground">
              Revisá tus productos antes de continuar
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-6 text-center">
              <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Tu carrito está vacío</p>
              <p className="text-sm text-muted-foreground">
                Agregá productos para continuar con la compra.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const itemTotal = (item.price ?? 0) * (item.quantity ?? 0);
              const vatRate = item.vatRate ?? 0.21;
              const itemNet = netFromGrossCents(itemTotal, vatRate);

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border bg-background p-3 transition hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 font-semibold">
                        {item.name ?? "Producto"}
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatQuantity(
                          item.quantity ?? 0,
                          item.unitType ?? "PER_KG"
                        )}
                      </p>

                      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        Precio sin impuestos: {formatPrice(itemNet)}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-semibold">
                      {formatPrice(itemTotal)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-3 rounded-2xl bg-muted/30 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatPrice(subtotal)}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Precio sin impuestos</span>
            <span className="text-muted-foreground">{formatPrice(subtotalNet)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Retiro en local</span>
            <span className="font-medium">Gratis</span>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold">Total</span>
            <span className="text-2xl font-bold text-primary">
              {formatPrice(total)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}