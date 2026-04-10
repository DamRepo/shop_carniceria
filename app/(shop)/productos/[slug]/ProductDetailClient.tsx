"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  formatPrice,
  getUnitLabel,
  formatQuantity,
  stepUpKg,
  stepDownKg,
  getVatRate,
  netFromGrossCents,
  getReferencePriceLabel,
} from "@/lib/utils-format";
import { useCartStore } from "@/lib/store";
import { toast } from "sonner";

/* =======================
   DTO TYPES (sin Prisma)
======================= */

type UnitType = "PER_KG" | "PER_UNIT";

type CategoryDTO = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  vatRate?: number | null; // ✅ nuevo
};

type ProductWithCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;

  unitType: UnitType;
  price: number;
  stock: number;

  netWeightGr?: number | null;
  netVolumeMl?: number | null;

  // ✅ IVA opcional por producto
  vatRate?: number | null;

  isActive: boolean;
  isFeatured: boolean;
  isOnSale: boolean;
  salePrice?: number | null;
  saleEndDate?: string | null;
  discountPercent?: number | null;

  categoryId: string;
  category: CategoryDTO;
};

type ProductDetailResponse = {
  product: ProductWithCategory;
  related: ProductWithCategory[];
};

function hasActiveOffer(p: ProductWithCategory) {
  if (!p.isOnSale) return false;
  if (!p.saleEndDate) return true;

  const t = new Date(p.saleEndDate).getTime();
  if (!Number.isFinite(t)) return true;
  return t > Date.now();
}

// Para PER_UNIT: siempre entero mínimo 1
const normalizeUnitQty = (q: unknown) => {
  const n = Math.floor(Number(q));
  return Number.isFinite(n) && n >= 1 ? n : 1;
};

// Para PER_KG: mínimo 0.1kg, permitimos decimales
const normalizeKgQty = (q: unknown) => {
  const n = Number(q);
  if (!Number.isFinite(n)) return 1;
  const clamped = Math.max(0.1, n);
  // redondeo para evitar flotantes
  return +clamped.toFixed(3);
};

// ✅ dedupe por id (por si la API devuelve repetidos)
const uniqueById = (arr: ProductWithCategory[]) =>
  Array.from(new Map(arr.map((x) => [x.id, x])).values());

export default function ProductDetailClient({ slug }: { slug: string }) {
  const router = useRouter();

  const [product, setProduct] = useState<ProductWithCategory | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [quantity, setQuantity] = useState<number>(1);

  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    if (!slug) return;
    void fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // NUEVO: fuerza scroll arriba al entrar al producto
  useEffect(() => {
    if (!slug) return;

    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
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

      // ✅ EXCLUIR el producto actual de "related"
      const relatedRaw = Array.isArray(data?.related) ? data.related : [];
      const relatedFiltered = p
        ? relatedRaw.filter((rp) => rp.id !== p.id && rp.slug !== p.slug)
        : relatedRaw;

      setRelatedProducts(uniqueById(relatedFiltered));

      // ✅ por defecto: 1 (para kg y unidad)
      setQuantity(1);
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Error al cargar el producto");
    } finally {
      setLoading(false);
    }
  };

  const unitType: UnitType = product?.unitType ?? "PER_KG";
  const canBuy = (product?.stock ?? 0) > 0;

  // ✅ oferta / precio final
  const offerActive = product ? hasActiveOffer(product) : false;
  const finalUnitPrice =
    product && offerActive && product.salePrice != null && product.salePrice > 0
      ? product.salePrice
      : product?.price ?? 0;

  // ✅ IVA efectivo
  const vatRate = product ? getVatRate(product) : 0.21;

  // ✅ cantidad normalizada según unidad
  const safeQty =
    unitType === "PER_KG"
      ? normalizeKgQty(quantity)
      : normalizeUnitQty(quantity);

  // stock máximo (mantenemos tu stock int; para KG permitimos hasta stock como entero kg)
  const rawMax = product?.stock ?? 0;
  const maxQty =
    unitType === "PER_KG"
      ? Math.max(0.1, Number(rawMax) || 0) // si stock fuera 50 => 50kg
      : Math.max(0, Math.floor(Number(rawMax) || 0)); // unidades enteras

  const handleQuantityChange = (value: string) => {
    if (value === "" || value === ".") return;

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;

    if (unitType === "PER_KG") {
      const q = normalizeKgQty(parsed);
      const clamped = maxQty > 0 ? Math.min(maxQty, q) : q;
      setQuantity(clamped);
      return;
    }

    const q = normalizeUnitQty(parsed);
    const clamped = Math.min(maxQty > 0 ? maxQty : q, Math.max(1, q));
    setQuantity(clamped);
  };

  const incrementQuantity = () => {
    if (!product) return;
    if (maxQty <= 0) return;

    if (unitType === "PER_KG") {
      setQuantity((prev) => {
        const next = stepUpKg(normalizeKgQty(prev));
        return Math.min(maxQty, next);
      });
      return;
    }

    setQuantity((prev) => Math.min(maxQty, normalizeUnitQty(prev) + 1));
  };

  const decrementQuantity = () => {
    if (!product) return;

    if (unitType === "PER_KG") {
      setQuantity((prev) => stepDownKg(normalizeKgQty(prev)));
      return;
    }

    setQuantity((prev) => Math.max(1, normalizeUnitQty(prev) - 1));
  };

  const addToCart = (goTo: "/carrito" | "/checkout") => {
    if (!product) return;

    const q = safeQty;

    if (q <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    if (maxQty > 0 && q > maxQty) {
      toast.error("Stock insuficiente");
      return;
    }

    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: finalUnitPrice, // ✅ respeta oferta
      quantity: q,
      unitType: product.unitType ?? "PER_KG",
      image: product.image ?? undefined,

      // ✅ NUEVO: guardamos IVA en el carrito
      vatRate,
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

  const total = finalUnitPrice * safeQty;

  // ✅ netos (sin impuestos nacionales)
  const netUnit = netFromGrossCents(finalUnitPrice, vatRate);
  const netTotal = netFromGrossCents(total, vatRate);

  const referencePriceLabel = getReferencePriceLabel({
    priceCents: finalUnitPrice,
    unitType,
    netWeightGr: product.netWeightGr,
    netVolumeMl: product.netVolumeMl,
  });

  const stockLabel =
    unitType === "PER_KG"
      ? `${Math.floor(product.stock ?? 0)} kg`
      : `${Math.floor(product.stock ?? 0)} ${getUnitLabel(unitType)}`;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                  {offerActive && finalUnitPrice !== product.price ? (
                    <>
                      <p className="text-sm text-muted-foreground line-through">
                        {formatPrice(product.price ?? 0)}
                      </p>
                      <p className="text-4xl font-bold text-primary">
                        {formatPrice(finalUnitPrice)}
                      </p>
                    </>
                  ) : (
                    <p className="text-4xl font-bold text-primary">
                      {formatPrice(finalUnitPrice)}
                    </p>
                  )}

                  <p className="text-sm text-muted-foreground">
                    por {getUnitLabel(unitType)}
                  </p>

                  {referencePriceLabel && (
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">
                      {referencePriceLabel}
                    </p>
                  )}

                  {/* ✅ neto unitario */}
                  <p className="text-xs text-muted-foreground mt-1">
                    Precio sin impuestos Nacionales: {formatPrice(netUnit)} por{" "}
                    {getUnitLabel(unitType)}
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
                      disabled={
                        !canBuy ||
                        (unitType === "PER_KG"
                          ? safeQty <= 0.1
                          : safeQty <= 1)
                      }
                      type="button"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>

                    <Input
                      type="number"
                      value={safeQty}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      step={unitType === "PER_KG" ? (safeQty < 1 ? 0.1 : 0.5) : 1}
                      min={unitType === "PER_KG" ? 0.1 : 1}
                      max={maxQty > 0 ? maxQty : undefined}
                      className="text-center"
                      disabled={!canBuy}
                    />

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={incrementQuantity}
                      disabled={!canBuy || (maxQty > 0 && safeQty >= maxQty)}
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* ✅ mostrar cantidad “humana” */}

                  <p className="text-xs text-muted-foreground mt-1">
                    Stock disponible: {stockLabel}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-lg font-semibold mb-1">
                    <span>Total:</span>
                    <span className="text-2xl text-primary">
                      {formatPrice(total)}
                    </span>
                  </div>

                  {/* ✅ neto del total */}
                  <p className="text-xs text-muted-foreground mt-1">
                    Total sin impuestos Nacionales: {formatPrice(netTotal)}
                  </p>

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

      {relatedProducts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Productos que te pueden interesar
          </h2>

          <div className="grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p as any} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}