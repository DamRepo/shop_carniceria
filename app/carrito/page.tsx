'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, Minus, Plus, ShoppingCart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { formatPrice, formatQuantity } from '@/lib/utils-format';
import { useCartStore } from '@/lib/store';

export default function CartPage() {
  const router = useRouter();
  const items = useCartStore((state) => state?.items);
  const removeItem = useCartStore((state) => state?.removeItem);
  const updateQuantity = useCartStore((state) => state?.updateQuantity);
  const getTotalPrice = useCartStore((state) => state?.getTotalPrice);

  const handleQuantityChange = (itemId: string, value: string) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) {
      updateQuantity?.(itemId, parsed);
    }
  };

  const incrementQuantity = (itemId: string, currentQuantity: number, unitType: string) => {
    const step = unitType === 'PER_KG' ? 0.5 : 1;
    updateQuantity?.(itemId, (currentQuantity ?? 0) + step);
  };

  const decrementQuantity = (itemId: string, currentQuantity: number, unitType: string) => {
    const step = unitType === 'PER_KG' ? 0.5 : 1;
    const min = unitType === 'PER_KG' ? 0.5 : 1;
    const newQuantity = Math.max(min, (currentQuantity ?? 0) - step);
    if (newQuantity >= min) {
      updateQuantity?.(itemId, newQuantity);
    }
  };

  const totalPrice = getTotalPrice?.() ?? 0;

  if ((items?.length ?? 0) === 0) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-20">
        <div className="text-center space-y-4">
          <ShoppingCart className="h-24 w-24 mx-auto text-muted-foreground" />
          <h1 className="text-3xl font-bold">Tu carrito está vacío</h1>
          <p className="text-muted-foreground text-lg">
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
      <h1 className="text-4xl font-bold mb-8">Carrito de Compras</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de items */}
        <div className="lg:col-span-2 space-y-4">
          {items?.map?.((item) => (
            <Card key={item?.id ?? ''} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Imagen */}
                  <div className="relative w-24 h-24 bg-muted rounded-md overflow-hidden flex-shrink-0">
                    {item?.image ? (
                      <Image
                        src={item.image}
                        alt={item?.name ?? 'Producto'}
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
                      href={`/productos/${item?.slug ?? ''}`}
                      className="font-semibold text-lg hover:text-primary transition-colors line-clamp-1"
                    >
                      {item?.name ?? 'Producto'}
                    </Link>
                    <p className="text-muted-foreground">
                      {formatPrice(item?.price ?? 0)} por {item?.unitType === 'PER_KG' ? 'kg' : 'unidad'}
                    </p>

                    {/* Cantidad */}
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => decrementQuantity(item?.id ?? '', item?.quantity ?? 0, item?.unitType ?? 'PER_UNIT')}
                        className="h-8 w-8"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={item?.quantity ?? 0}
                        onChange={(e) => handleQuantityChange(item?.id ?? '', e?.target?.value ?? '')}
                        step={item?.unitType === 'PER_KG' ? 0.5 : 1}
                        min={item?.unitType === 'PER_KG' ? 0.5 : 1}
                        className="w-20 h-8 text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => incrementQuantity(item?.id ?? '', item?.quantity ?? 0, item?.unitType ?? 'PER_UNIT')}
                        className="h-8 w-8"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm text-muted-foreground ml-2">
                        {formatQuantity(item?.quantity ?? 0, item?.unitType ?? 'PER_UNIT')}
                      </span>
                    </div>
                  </div>

                  {/* Precio y eliminar */}
                  <div className="flex flex-col items-end justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem?.(item?.id ?? '')}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <p className="text-xl font-bold text-primary">
                      {formatPrice(((item?.price ?? 0) * (item?.quantity ?? 0)))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )) ?? null}
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
                <div className="flex justify-between text-muted-foreground text-sm">
                  <span>Envío</span>
                  <span>A calcular</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-2xl font-bold pt-4 border-t">
                <span>Total</span>
                <span className="text-primary">{formatPrice(totalPrice)}</span>
              </div>
            </CardContent>

            <CardFooter className="p-6 pt-0">
              <Button
                onClick={() => router?.push?.('/checkout')}
                size="lg"
                className="w-full"
              >
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
