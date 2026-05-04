"use client";

import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Minus, Plus, ShoppingCart } from "lucide-react";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  formatPrice,
  formatQuantity,
  netFromGrossCents,
} from "@/lib/utils-format";
import {
  useCartStore,
  type CartItem,
  getItemRules,
  normalizeQtyWithRules,
  incrementByRules,
  decrementByRules,
  safePositiveNumberOrNull,
} from "@/lib/store";

const getOfferRuleLabel = (item: Partial<CartItem>) => {
  const min = safePositiveNumberOrNull(item.minPurchaseQty);
  const step = safePositiveNumberOrNull(item.qtyStep);

  if (!min || !step) return null;

  if (item.unitType === "PER_KG" && min >= 2 && step >= 2) {
    return `Promo por ${min} kg · suma de a ${step} kg`;
  }

  if (item.unitType === "PER_UNIT" && min >= 2) {
    return `Promo por ${min} un · suma de a ${step} un`;
  }

  return null;
};

export default function CartPage() {
  const { data: session, status } = useSession();
  const userId = (session as any)?.user?.id as string | undefined;

  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const totalPrice = useCartStore((s) => s.getTotalPrice());

  const prevUserIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (status === "unauthenticated") {
      return;
    }

    if (status === "authenticated") {
      const prev = prevUserIdRef.current;
      if (prev && userId && prev !== userId) {
        clearCart();
      }
      prevUserIdRef.current = userId;
    }
  }, [status, userId, clearCart]);

  const handleQuantityChange = (
    item: {
      id: string;
      unitType: "PER_KG" | "PER_UNIT";
      quantity: number;
      minPurchaseQty?: number | null;
      qtyStep?: number | null;
      maxPurchaseQty?: number | null;
      allowsDecimals?: boolean;
    },
    value: string
  ) => {
    if (value === "" || value === ".") return;

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;

    const q = normalizeQtyWithRules(item, parsed);
    updateQuantity(item.id, q);
  };

  const incrementQuantity = (item: {
    id: string;
    unitType: "PER_KG" | "PER_UNIT";
    quantity: number;
    minPurchaseQty?: number | null;
    qtyStep?: number | null;
    maxPurchaseQty?: number | null;
    allowsDecimals?: boolean;
  }) => {
    const next = incrementByRules(item);
    updateQuantity(item.id, next);
  };

  const decrementQuantity = (item: {
    id: string;
    unitType: "PER_KG" | "PER_UNIT";
    quantity: number;
    minPurchaseQty?: number | null;
    qtyStep?: number | null;
    maxPurchaseQty?: number | null;
    allowsDecimals?: boolean;
  }) => {
    const next = decrementByRules(item);
    updateQuantity(item.id, next);
  };

  // totalPrice ya viene calculado desde el selector de Zustand

  const normalizedItems = useMemo(() => {
    return (items ?? []).map((it) => ({
      ...it,
      quantity: normalizeQtyWithRules(
        {
          unitType: it.unitType,
          quantity: it.quantity,
          minPurchaseQty: it.minPurchaseQty,
          qtyStep: it.qtyStep,
          maxPurchaseQty: it.maxPurchaseQty,
          allowsDecimals: it.allowsDecimals,
        },
        it.quantity
      ),
      vatRate: it.vatRate ?? 0.21,
    }));
  }, [items]);

  const totalNet = useMemo(() => {
    return normalizedItems.reduce((sum, it) => {
      const itemTotal = (it.price ?? 0) * (it.quantity ?? 0);
      return sum + netFromGrossCents(itemTotal, it.vatRate ?? 0.21);
    }, 0);
  }, [normalizedItems]);

  if (status === "loading") {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-20">
        <div className="space-y-4 text-center">
          <ShoppingCart className="mx-auto h-24 w-24 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Cargando...</h1>
          <p className="text-muted-foreground">Verificando sesión</p>
        </div>
      </div>
    );
  }

  if (normalizedItems.length === 0) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-20">
        <div className="space-y-4 text-center">
          <ShoppingCart className="mx-auto h-24 w-24 text-muted-foreground" />
          <h1 className="text-3xl font-bold">Tu carrito está vacío</h1>
          <p className="text-lg text-muted-foreground">
            Aún no has agregado productos a tu carrito
          </p>
          <Link href="/productos">
            <Button size="lg" className="mt-4">
              Ver productos
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-4xl font-bold">Carrito de Compras</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {normalizedItems.map((item) => {
            const itemTotal = (item.price ?? 0) * (item.quantity ?? 0);
            const itemNet = netFromGrossCents(itemTotal, item.vatRate ?? 0.21);
            const offerRuleLabel = getOfferRuleLabel(item);
            const rules = getItemRules(item);

            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex gap-3">
                    {/* Imagen: ancho fijo, no crece ni encoge */}
                    <div className="relative h-20 w-20 flex-none overflow-hidden rounded-md bg-muted">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name ?? "Producto"}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Columna derecha: todo el contenido */}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      {/* Fila: nombre + botón eliminar */}
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/productos/${item.slug ?? ""}`}
                          className="text-sm font-semibold leading-snug transition-colors hover:text-primary sm:text-base"
                        >
                          {item.name ?? "Producto"}
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="h-7 w-7 flex-none text-destructive hover:text-destructive"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Precio unitario */}
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(item.price ?? 0)} por{" "}
                        {item.unitType === "PER_KG" ? "kg" : "unidad"}
                      </p>

                      <p className="text-[11px] text-muted-foreground">
                        Sin imp. nac.:{" "}
                        {formatPrice(
                          netFromGrossCents(
                            item.price ?? 0,
                            item.vatRate ?? 0.21
                          )
                        )}
                      </p>

                      {offerRuleLabel ? (
                        <p className="text-xs font-medium text-red-600">
                          {offerRuleLabel}
                        </p>
                      ) : null}

                      {/* Fila inferior: controles + total */}
                      <div className="mt-2 flex items-end justify-between">
                        {/* Controles de cantidad */}
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => decrementQuantity(item)}
                            className="h-8 w-8"
                            type="button"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>

                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(item, e.target.value ?? "")
                            }
                            step={rules.qtyStep}
                            min={rules.minPurchaseQty}
                            max={rules.maxPurchaseQty ?? undefined}
                            className="h-8 w-16 text-center sm:w-24"
                          />

                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => incrementQuantity(item)}
                            className="h-8 w-8"
                            type="button"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Total del item: precio + sin imp apilados */}
                        <div className="text-right">
                          <p className="text-base font-bold text-primary sm:text-lg">
                            {formatPrice(itemTotal)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            sin imp: {formatPrice(itemNet)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-2xl font-bold">Resumen</h2>

              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>

                <div className="flex justify-between text-muted-foreground">
                  <span>Sin impuestos nacionales</span>
                  <span>{formatPrice(totalNet)}</span>
                </div>

                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Envío</span>
                  <span>A calcular</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-2xl font-bold">
                  <span>Total</span>
                  <span className="text-primary">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-6 pt-0">
              {status === "authenticated" ? (
                <Button className="w-full rounded-xl" asChild size="lg">
                  <Link href="/checkout">Proceder al pago</Link>
                </Button>
              ) : (
                <div className="flex w-full flex-col gap-2">
                  <Button className="w-full rounded-xl" asChild size="lg">
                    <Link href="/checkout">Continuar como invitado</Link>
                  </Button>
                  <Button variant="outline" className="w-full rounded-xl" asChild size="lg">
                    <Link href="/auth/login?redirectTo=/checkout">
                      Iniciar sesión
                    </Link>
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Con una cuenta podés ver el historial de tus compras
                  </p>
                </div>
              )}
            </CardFooter>
          </Card>

          <Link href="/productos">
            <Button variant="link" className="mt-4 w-full">
              Continuar comprando
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}