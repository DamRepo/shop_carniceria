'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Zap } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice, getUnitLabel } from '@/lib/utils-format';
import { useCartStore } from '@/lib/store';
import { toast } from 'sonner';
import type { Product } from '@prisma/client';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state?.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if ((product?.stock ?? 0) <= 0) {
      toast?.error?.('Producto sin stock');
      return;
    }

    const defaultQuantity = product?.unitType === 'PER_KG' ? 1 : 1;

    addItem?.({
      id: product?.id ?? '',
      name: product?.name ?? '',
      slug: product?.slug ?? '',
      price: product?.price ?? 0,
      quantity: defaultQuantity,
      unitType: product?.unitType ?? 'PER_UNIT',
      image: product?.image ?? undefined,
    });

    toast?.success?.(`${product?.name ?? 'Producto'} agregado al carrito`);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if ((product?.stock ?? 0) <= 0) {
      toast?.error?.('Producto sin stock');
      return;
    }

    const defaultQuantity = product?.unitType === 'PER_KG' ? 1 : 1;

    // Agregar al carrito
    addItem?.({
      id: product?.id ?? '',
      name: product?.name ?? '',
      slug: product?.slug ?? '',
      price: product?.price ?? 0,
      quantity: defaultQuantity,
      unitType: product?.unitType ?? 'PER_UNIT',
      image: product?.image ?? undefined,
    });

    toast?.success?.('Producto agregado, redirigiendo al checkout...');
    setTimeout(() => {
      router.push('/checkout');
    }, 500);
  };

  return (
    <Link href={`/productos/${product?.slug ?? ''}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/20 hover:border-primary/50 h-full">
        {/* Imagen */}
        <div className="relative aspect-video bg-muted overflow-hidden">
          {product?.image ? (
            <Image
              src={product.image}
              alt={product?.name ?? 'Producto'}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ShoppingCart className="h-16 w-16" />
            </div>
          )}
          {product?.stock !== undefined && product?.stock <= 5 && product?.stock > 0 && (
            <Badge className="absolute top-2 right-2 bg-orange-500 hover:bg-orange-600">
              Últimas unidades
            </Badge>
          )}
          {product?.stock !== undefined && product?.stock <= 0 && (
            <Badge className="absolute top-2 right-2 bg-red-600 hover:bg-red-700">
              Agotado
            </Badge>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-1">{product?.name ?? 'Producto'}</h3>
          {product?.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {product.description}
            </p>
          )}
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-primary">
              {formatPrice(product?.price ?? 0)}
            </p>
            <p className="text-sm text-muted-foreground">por {getUnitLabel(product?.unitType ?? 'PER_UNIT')}</p>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 flex flex-col gap-2">
          <Button
            onClick={handleAddToCart}
            disabled={(product?.stock ?? 0) <= 0}
            className="w-full"
            variant="outline"
            size="lg"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Agregar al carrito
          </Button>
          <Button
            onClick={handleBuyNow}
            disabled={(product?.stock ?? 0) <= 0}
            className="w-full bg-primary hover:bg-primary/90"
            size="lg"
          >
            <Zap className="mr-2 h-4 w-4" />
            Comprar ahora
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
