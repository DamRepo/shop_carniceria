"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingCart, Zap, Tag } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, getUnitLabel, netFromGrossCents, getVatRate } from "@/lib/utils-format";
import { useCartStore } from "@/lib/store";
import { toast } from "sonner";

type UnitType = "PER_KG" | "PER_UNIT";

interface ProductDTO {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;

  unitType?: UnitType;
  price: number;
  stock: number;

  // ❌ SACADO: netWeightGr / netVolumeMl

  vatRate?: number | null;
  category?: { vatRate?: number | null } | null;

  isOnSale?: boolean;
  salePrice?: number | null;
  saleEndDate?: string | null;
  discountPercent?: number | null;
}

interface ProductCardProps {
  product: ProductDTO;
}

function hasActiveOffer(p: ProductDTO) {
  if (!p.isOnSale) return false;
  if (!p.saleEndDate) return true;

  const t = new Date(p.saleEndDate).getTime();
  if (!Number.isFinite(t)) return true;
  return t > Date.now();
}

function calcDiscountPercent(original: number, sale: number) {
  if (!Number.isFinite(original) || !Number.isFinite(sale)) return null;
  if (original <= 0 || sale <= 0 || sale >= original) return null;
  return Math.round(((original - sale) / original) * 100);
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

  const canBuy = (product.stock ?? 0) > 0;
  const offerActive = hasActiveOffer(product);

  const finalPrice =
    offerActive && product.salePrice != null && product.salePrice > 0
      ? product.salePrice
      : product.price;

  const discount =
    offerActive &&
    product.salePrice != null &&
    product.salePrice > 0 &&
    product.price > product.salePrice
      ? product.discountPercent ?? calcDiscountPercent(product.price, product.salePrice)
      : null;

  const vatRate = getVatRate(product);
  const netPrice = netFromGrossCents(finalPrice, vatRate);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canBuy) return toast.error("Producto sin stock");

    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: finalPrice,
      quantity: 1,
      unitType: product.unitType ?? "PER_KG",
      image: product.image ?? undefined,
      vatRate,
    });

    toast.success(`${product.name} agregado al carrito`);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canBuy) return toast.error("Producto sin stock");

    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: finalPrice,
      quantity: 1,
      unitType: product.unitType ?? "PER_KG",
      image: product.image ?? undefined,
      vatRate,
    });

    toast.success("Producto agregado, redirigiendo al checkout...");
    setTimeout(() => router.push("/checkout"), 450);
  };

  return (
    <Link href={`/productos/${product.slug}`} className="block h-full">
      <Card
        className="
          group h-full flex flex-col overflow-hidden
          transition-all hover:shadow-lg hover:shadow-primary/20 hover:border-primary/50
        "
      >
        {/* IMAGEN: grande, sin margen interno */}
        <div className="relative bg-muted overflow-hidden h-[220px] md:h-[240px]">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover object-[center_30%] transition-transform group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ShoppingCart className="h-14 w-14" />
            </div>
          )}

          {offerActive && (
            <div className="absolute top-2 left-2 flex items-center gap-2">
              <Badge className="bg-red-600 hover:bg-red-700 text-white">
                <Tag className="h-3 w-3 mr-1" />
                Oferta
              </Badge>
              {discount !== null && (
                <Badge className="bg-black text-white font-bold">-{discount}%</Badge>
              )}
            </div>
          )}

          {product.stock > 0 && product.stock <= 5 && (
            <Badge className="absolute top-2 right-2 bg-orange-500 hover:bg-orange-600">
              Últimas
            </Badge>
          )}

          {product.stock <= 0 && (
            <Badge className="absolute top-2 right-2 bg-red-600 hover:bg-red-700">
              Agotado
            </Badge>
          )}
        </div>

        <CardContent className="p-3 flex-1 flex flex-col gap-1.5">
          <h3 className="font-semibold text-[15px] leading-snug line-clamp-1">
            {product.name}
          </h3>

          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[34px]">
            {product.description?.trim() || " "}
          </p>

          <div className="flex flex-col gap-1">
            <div className="leading-tight">
              {offerActive && finalPrice !== product.price ? (
                <>
                  <span className="block text-xs text-muted-foreground line-through">
                    {formatPrice(product.price)}
                  </span>
                  <span className="block text-xl font-bold text-primary">
                    {formatPrice(finalPrice)}
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-xs text-muted-foreground">{" "}</span>
                  <span className="block text-xl font-bold text-primary">
                    {formatPrice(product.price)}
                  </span>
                </>
              )}
            </div>

            <span className="text-xs text-muted-foreground">
              Precio por {getUnitLabel(product.unitType ?? "PER_KG")}
            </span>

            <span className="text-[11px] text-muted-foreground leading-tight lowercase">
              precio sin impuestos nacionales: {formatPrice(netPrice)}
            </span>
          </div>

          <div className="mt-auto" />
        </CardContent>

        <CardFooter className="p-3 pt-0 flex flex-col gap-2">
          <Button
            onClick={handleAddToCart}
            disabled={!canBuy}
            className="w-full"
            variant="outline"
            size="lg"
            type="button"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Agregar al carrito
          </Button>

          <Button
            onClick={handleBuyNow}
            disabled={!canBuy}
            className="w-full bg-primary hover:bg-primary/90"
            size="lg"
            type="button"
          >
            <Zap className="mr-2 h-4 w-4" />
            Comprar ahora
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}