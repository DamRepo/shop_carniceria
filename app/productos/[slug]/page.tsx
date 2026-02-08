"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Minus,
  Plus,
  ShoppingCart,
  ArrowLeft,
  Loader2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProductCard } from "@/components/product-card";
import { formatPrice, getUnitLabel } from "@/lib/utils-format";
import { useCartStore } from "@/lib/store";
import { toast } from "sonner";
import type { Product, Category } from "@prisma/client";

type ProductWithCategory = Product & {
  category: Category;
};

type ProductDetailResponse = {
  product: ProductWithCategory;
  related: ProductWithCategory[];
};

function normalizeSlug(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? "";
  return "";
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = useMemo(() => normalizeSlug((params as any)?.slug), [params]);

  const [product, setProduct] = useState<ProductWithCategory | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductWithCategory[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState<number>(1);

  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    if (!slug) return;
    void fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(slug)}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        toast.error("Producto no encontrado");
        router.push("/productos");
        return;
      }

      const data = (await res.json()) as ProductDetailResponse;

      const p = data?.product ?? null;
      setProduct(p);

      setRelatedProducts(Array.isArray(data?.related) ? data.related : []);

      // Cantidad inicial: por kilo 0.5, por unidad 1
      const isKg = (p?.unitType ?? "PER_KG") === "PER_KG";
      setQuantity(isKg ? 0.5 : 1);
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Error al cargar el producto");
    } finally {
      setLoading(false);
    }
  };

  // unitType real (fallback solo si viene vacío)
  const unitType = (product?.unitType ?? "PER_KG") as Product["unitType"];
  const isKg = unitType === "PER_KG";

  const step = isKg ? 0.5 : 1;
  const minQty = isKg ? 0.5 : 1;

  // Para PER_UNIT, el máximo debería ser entero
  const rawMax = product?.stock ?? 0;
  const maxQty = isKg ? rawMax : Math.floor(rawMax);

  const handleQuantityChange = (value: string) => {
    if (value === "" || value === ".") return;

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    // ✅ Fuerza entero si es por unidad
    const q = isKg ? parsed : Math.round(parsed);

    // Clamp al stock
    const clamped = Math.min(maxQty, Math.max(minQty, q));
    setQuantity(clamped);
  };

  const incrementQuantity = () => {
    if (!product) return;
    if (maxQty <= 0) return;
    setQuantity((prev) => Math.min(maxQty, (prev ?? 0) + step));
  };

  const decrementQuantity = () => {
    if (!product) return;
    setQuantity((prev) => Math.max(minQty, (prev ?? 0) - step));
  };

  const canBuy = (product?.stock ?? 0) > 0;

  const addToCart = (goTo: "/carrito" | "/checkout") => {
    if (!product) return;

    const q = isKg ? quantity : Math.round(quantity);

    if ((q ?? 0) <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    if ((product.stock ?? 0) < (q ?? 0)) {
      toast.error("Stock insuficiente");
      return;
    }

    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price ?? 0,
      quantity: q,
      unitType: (product.unitType ?? "PER_KG") as Product["unitType"],
      image: product.image ?? undefined,
    });

    if (goTo === "/carrito") {
      toast.success(`${product.name} agregado al carrito`);
      router.push("/carrito");
    } else {
      toast.success("Producto agregado, redirigiendo al checkout...");
      setTimeout(() => router.push("/checkout"), 500);
    }
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

  const lowStock =
    typeof product.stock === "number"
      ? product.stock <= 5 && product.stock > 0
      : false;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Imagen */}
        <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
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
              {product.category?.name ?? "Sin categoría"}
            </Badge>

            <h1 className="text-4xl font-bold mb-4">{product.name}</h1>

            {product.description && (
              <p className="text-muted-foreground text-lg">
                {product.description}
              </p>
            )}
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <p className="text-4xl font-bold text-primary">
                    {formatPrice(product.price ?? 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    por {getUnitLabel(unitType)}
                  </p>
                </div>

                {lowStock && (
                  <Badge variant="destructive">Últimas unidades</Badge>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Cantidad ({getUnitLabel(unitType)})
                  </label>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={decrementQuantity}
                      disabled={!canBuy}
                      type="button"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>

                    <Input
                      type="number"
                      value={Number.isFinite(quantity) ? quantity : minQty}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      step={step}
                      min={minQty}
                      max={maxQty}
                      className="text-center"
                      disabled={!canBuy}
                    />

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={incrementQuantity}
                      disabled={!canBuy || (quantity ?? 0) >= maxQty}
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1">
                    Stock disponible:{" "}
                    {typeof product.stock === "number"
                      ? product.stock.toFixed(isKg ? 2 : 0)
                      : 0}{" "}
                    {getUnitLabel(unitType)}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-lg font-semibold mb-4">
                    <span>Total:</span>
                    <span className="text-2xl text-primary">
                      {formatPrice((product.price ?? 0) * (quantity ?? 0))}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => addToCart("/carrito")}
                      disabled={!canBuy}
                      size="lg"
                      variant="outline"
                      className="w-full"
                      type="button"
                    >
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      {canBuy ? "Agregar al carrito" : "Sin stock"}
                    </Button>

                    <Button
                      onClick={() => addToCart("/checkout")}
                      disabled={!canBuy}
                      size="lg"
                      className="w-full bg-primary hover:bg-primary/90"
                      type="button"
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

      {/* Relacionados */}
      {relatedProducts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Productos que te pueden interesar
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
