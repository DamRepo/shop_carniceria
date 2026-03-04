"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Minus, Plus, ShoppingCart, ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  formatPrice,
  formatQuantity,
  stepUpKg,
  stepDownKg,
  netFromGrossCents,
} from "@/lib/utils-format";
import { useCartStore } from "@/lib/store";

const normalizeUnitQty = (q: unknown) => {
  const n = Math.floor(Number(q));
  return Number.isFinite(n) && n >= 1 ? n : 1;
};

const normalizeKgQty = (q: unknown) => {
  const n = Number(q);
  if (!Number.isFinite(n)) return 1;
  const clamped = Math.max(0.1, n);
  return +clamped.toFixed(3);
};

export default function CartPage() {
  const router = useRouter();

  // Auth
  const { data: session, status } = useSession();
  const userId = (session as any)?.user?.id as string | undefined;

  // Cart store
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const getTotalPrice = useCartStore((s) => s.getTotalPrice);

  // 1) Si se desloguea => ocultar carrito y limpiar
  // 2) Si cambia de usuario => limpiar (para no mezclar carritos)
  const prevUserIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (status === "unauthenticated") {
      clearCart();
      prevUserIdRef.current = undefined;
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

  // Helpers UI
  const handleQuantityChange = (itemId: string, unitType: "PER_KG" | "PER_UNIT", value: string) => {
    if (value === "" || value === ".") return;

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;

    const q = unitType === "PER_KG" ? normalizeKgQty(parsed) : normalizeUnitQty(parsed);
    updateQuantity(itemId, q);
  };

  const incrementQuantity = (itemId: string, unitType: "PER_KG" | "PER_UNIT", currentQuantity: number) => {
    if (unitType === "PER_KG") {
      const next = stepUpKg(normalizeKgQty(currentQuantity));
      updateQuantity(itemId, next);
      return;
    }

    const next = normalizeUnitQty(currentQuantity) + 1;
    updateQuantity(itemId, next);
  };

  const decrementQuantity = (itemId: string, unitType: "PER_KG" | "PER_UNIT", currentQuantity: number) => {
    if (unitType === "PER_KG") {
      const next = stepDownKg(normalizeKgQty(currentQuantity));
      updateQuantity(itemId, next);
      return;
    }

    const next = Math.max(1, normalizeUnitQty(currentQuantity) - 1);
    updateQuantity(itemId, next);
  };

  const totalPrice = getTotalPrice();

  const normalizedItems = useMemo(() => {
    return (items ?? []).map((it) => ({
      ...it,
      quantity: it.unitType === "PER_KG" ? normalizeKgQty(it.quantity) : normalizeUnitQty(it.quantity),
      vatRate: it.vatRate ?? 0.21,
    }));
  }, [items]);

  // Neto total (sin impuestos nacionales) sumado por ítem (correcto con IVA mixto)
  const totalNet = useMemo(() => {
    return normalizedItems.reduce((sum, it) => {
      const itemTotal = (it.price ?? 0) * (it.quantity ?? 0);
      return sum + netFromGrossCents(itemTotal, it.vatRate ?? 0.21);
    }, 0);
  }, [normalizedItems]);

  // Cargando sesión
  if (status === "loading") {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-20">
        <div className="text-center space-y-4">
          <ShoppingCart className="h-24 w-24 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">Cargando...</h1>
          <p className="text-muted-foreground">Verificando sesión</p>
        </div>
      </div>
    );
  }

  // Sin sesión => NO mostrar carrito
  if (status === "unauthenticated") {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-20">
        <div className="text-center space-y-4">
          <ShoppingCart className="h-24 w-24 mx-auto text-muted-foreground" />
          <h1 className="text-3xl font-bold">Iniciá sesión para ver tu carrito</h1>
          <p className="text-muted-foreground text-lg">Tu carrito está ligado a tu cuenta.</p>
          <Link href="/auth/login">
            <Button size="lg" className="mt-4">
              Ir a login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Carrito vacío
  if (normalizedItems.length === 0) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-20">
        <div className="text-center space-y-4">
          <ShoppingCart className="h-24 w-24 mx-auto text-muted-foreground" />
          <h1 className="text-3xl font-bold">Tu carrito está vacío</h1>
          <p className="text-muted-foreground text-lg">Aún no has agregado productos a tu carrito</p>
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
      <h1 className="text-4xl font-bold mb-8">Carrito de Compras</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de items */}
        <div className="lg:col-span-2 space-y-4">
          {normalizedItems.map((item) => {
            const itemTotal = (item.price ?? 0) * (item.quantity ?? 0);
            const itemNet = netFromGrossCents(itemTotal, item.vatRate ?? 0.21);

            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Imagen */}
                    <div className="relative w-24 h-24 bg-muted rounded-md overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name ?? "Producto"}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Detalles */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/productos/${item.slug ?? ""}`}
                        className="font-semibold text-lg hover:text-primary transition-colors line-clamp-1"
                      >
                        {item.name ?? "Producto"}
                      </Link>

                      <p className="text-muted-foreground">
                        {formatPrice(item.price ?? 0)} por {item.unitType === "PER_KG" ? "kg" : "unidad"}
                      </p>

                      {/* ✅ NUEVO: neto unitario (sin impuestos) */}
                      <p className="text-[11px] text-muted-foreground">
                        Precio sin impuestos Nacionales:{" "}
                        {formatPrice(netFromGrossCents(item.price ?? 0, item.vatRate ?? 0.21))}
                      </p>

                      {/* Cantidad */}
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => decrementQuantity(item.id, item.unitType, item.quantity)}
                          className="h-8 w-8"
                          type="button"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>

                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, item.unitType, e.target.value ?? "")}
                          step={item.unitType === "PER_KG" ? (item.quantity < 1 ? 0.1 : 0.5) : 1}
                          min={item.unitType === "PER_KG" ? 0.1 : 1}
                          className="w-24 h-8 text-center"
                        />

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => incrementQuantity(item.id, item.unitType, item.quantity)}
                          className="h-8 w-8"
                          type="button"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>

                        <span className="text-sm text-muted-foreground ml-2">
                          {formatQuantity(item.quantity ?? 0, item.unitType ?? "PER_KG")}
                        </span>
                      </div>
                    </div>

                    {/* Precio y eliminar */}
                    <div className="flex flex-col items-end justify-between">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="text-destructive hover:text-destructive"
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">{formatPrice(itemTotal)}</p>
                        {/* ✅ NUEVO: neto por ítem */}
                        <p className="text-[11px] text-muted-foreground">
                          SIN IMPUESTOS: {formatPrice(itemNet)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Resumen */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-2xl font-bold">Resumen</h2>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>

                {/* ✅ NUEVO: neto total (correcto con IVA mixto) */}
                

                <div className="flex justify-between text-muted-foreground text-sm">
                  <span>Envío</span>
                  <span>A calcular</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center text-2xl font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(totalPrice)}</span>
                </div>                
              </div>
            </CardContent>

            <CardFooter className="p-6 pt-0">
              <Button onClick={() => router.push("/checkout")} size="lg" className="w-full" type="button">
                Proceder al pago
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          <Link href="/productos">
            <Button variant="link" className="w-full mt-4">
              Continuar comprando
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
