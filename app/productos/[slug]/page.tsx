'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Minus, Plus, ShoppingCart, ArrowLeft, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ProductCard } from '@/components/product-card';
import { formatPrice, getUnitLabel } from '@/lib/utils-format';
import { useCartStore } from '@/lib/store';
import { toast } from 'sonner';
import type { Product, Category } from '@prisma/client';

type ProductWithCategory = Product & {
  category: Category;
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [product, setProduct] = useState<ProductWithCategory | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  const addItem = useCartStore((state) => state?.addItem);

  useEffect(() => {
    if (slug) {
      fetchProduct();
      fetchRelatedProducts();
    }
  }, [slug]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${slug}`);
      if (res?.ok) {
        const data = await res?.json?.();
        setProduct(data ?? null);
        // Set initial quantity based on unit type
        setQuantity(data?.unitType === 'PER_KG' ? 1 : 1);
      } else {
        toast?.error?.('Producto no encontrado');
        router?.push?.('/productos');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast?.error?.('Error al cargar el producto');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedProducts = async () => {
    setLoadingRelated(true);
    try {
      const res = await fetch(`/api/products/${slug}/related`);
      if (res?.ok) {
        const data = await res?.json?.();
        setRelatedProducts(data ?? []);
      }
    } catch (error) {
      console.error('Error fetching related products:', error);
    } finally {
      setLoadingRelated(false);
    }
  };

  const handleQuantityChange = (value: string) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) {
      setQuantity(parsed);
    } else if (value === '' || value === '.') {
      // Allow empty or just decimal point for better UX
      return;
    }
  };

  const incrementQuantity = () => {
    const step = product?.unitType === 'PER_KG' ? 0.5 : 1;
    setQuantity((prev) => (prev ?? 0) + step);
  };

  const decrementQuantity = () => {
    const step = product?.unitType === 'PER_KG' ? 0.5 : 1;
    const min = product?.unitType === 'PER_KG' ? 0.5 : 1;
    setQuantity((prev) => Math.max(min, (prev ?? 0) - step));
  };

  const handleAddToCart = () => {
    if (!product) return;

    if ((quantity ?? 0) <= 0) {
      toast?.error?.('La cantidad debe ser mayor a 0');
      return;
    }

    if ((product?.stock ?? 0) < (quantity ?? 0)) {
      toast?.error?.('Stock insuficiente');
      return;
    }

    addItem?.({
      id: product?.id ?? '',
      name: product?.name ?? '',
      slug: product?.slug ?? '',
      price: product?.price ?? 0,
      quantity: quantity ?? 0,
      unitType: product?.unitType ?? 'PER_UNIT',
      image: product?.image ?? undefined,
    });

    toast?.success?.(`${product?.name ?? 'Producto'} agregado al carrito`);
    router?.push?.('/carrito');
  };

  const handleBuyNow = () => {
    if (!product) return;

    if ((quantity ?? 0) <= 0) {
      toast?.error?.('La cantidad debe ser mayor a 0');
      return;
    }

    if ((product?.stock ?? 0) < (quantity ?? 0)) {
      toast?.error?.('Stock insuficiente');
      return;
    }

    addItem?.({
      id: product?.id ?? '',
      name: product?.name ?? '',
      slug: product?.slug ?? '',
      price: product?.price ?? 0,
      quantity: quantity ?? 0,
      unitType: product?.unitType ?? 'PER_UNIT',
      image: product?.image ?? undefined,
    });

    toast?.success?.('Producto agregado, redirigiendo al checkout...');
    setTimeout(() => {
      router?.push?.('/checkout');
    }, 500);
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-20 text-center">
        <p className="text-muted-foreground text-lg">Producto no encontrado</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => router?.back?.()}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Imagen */}
        <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
          {product?.image ? (
            <Image
              src={product.image}
              alt={product?.name ?? 'Producto'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ShoppingCart className="h-32 w-32" />
            </div>
          )}
        </div>

        {/* Detalles */}
        <div className="flex flex-col space-y-6">
          <div>
            <Badge variant="secondary" className="mb-2">
              {product?.category?.name ?? 'Sin categoría'}
            </Badge>
            <h1 className="text-4xl font-bold mb-4">{product?.name ?? 'Producto'}</h1>
            {product?.description && (
              <p className="text-muted-foreground text-lg">{product.description}</p>
            )}
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <p className="text-4xl font-bold text-primary">
                    {formatPrice(product?.price ?? 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">por {getUnitLabel(product?.unitType ?? 'PER_UNIT')}</p>
                </div>
                {product?.stock !== undefined && product?.stock <= 5 && product?.stock > 0 && (
                  <Badge variant="destructive">Últimas unidades</Badge>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Cantidad ({getUnitLabel(product?.unitType ?? 'PER_UNIT')})
                  </label>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={decrementQuantity}
                      disabled={(product?.stock ?? 0) <= 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(e?.target?.value ?? '')}
                      step={product?.unitType === 'PER_KG' ? 0.5 : 1}
                      min={product?.unitType === 'PER_KG' ? 0.5 : 1}
                      max={product?.stock ?? 0}
                      className="text-center"
                      disabled={(product?.stock ?? 0) <= 0}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={incrementQuantity}
                      disabled={(product?.stock ?? 0) <= 0 || (quantity ?? 0) >= (product?.stock ?? 0)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stock disponible: {product?.stock?.toFixed?.(product?.unitType === 'PER_KG' ? 2 : 0) ?? 0} {getUnitLabel(product?.unitType ?? 'PER_UNIT')}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-lg font-semibold mb-4">
                    <span>Total:</span>
                    <span className="text-2xl text-primary">
                      {formatPrice(((product?.price ?? 0) * (quantity ?? 0)))}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={handleAddToCart}
                      disabled={(product?.stock ?? 0) <= 0}
                      size="lg"
                      variant="outline"
                      className="w-full"
                    >
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      {(product?.stock ?? 0) > 0 ? 'Agregar al carrito' : 'Sin stock'}
                    </Button>
                    <Button
                      onClick={handleBuyNow}
                      disabled={(product?.stock ?? 0) <= 0}
                      size="lg"
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      <Zap className="mr-2 h-5 w-5" />
                      Comprar ahora
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Productos relacionados */}
      {relatedProducts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Productos que te pueden interesar
          </h2>
          {loadingRelated ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
