"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingCart, Zap, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatPrice,
  netFromGrossCents,
  getVatRate,
  getReferencePriceLabel,
} from "@/lib/utils-format";
import { UnitPriceTag } from "@/components/UnitPriceTag";
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

  vatRate?: number | null;
  category?: { vatRate?: number | null } | null;

  netWeightGr?: number | null;
  netVolumeMl?: number | null;

  isOnSale?: boolean;
  salePrice?: number | null;
  saleEndDate?: string | null;
  discountPercent?: number | null;

  minPurchaseQty?: number | null;
  qtyStep?: number | null;
  maxPurchaseQty?: number | null;
  allowsDecimals?: boolean;

  measurementUnit?: string | null;
  unitMultiplier?: number | null;
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

function getInitialQty(product: ProductDTO) {
  const offerActive = hasActiveOffer(product);
  if (!offerActive) return 1;

  const min = Number(product.minPurchaseQty ?? 1);
  return Number.isFinite(min) && min > 0 ? min : 1;
}

function getOfferQtyLabel(product: ProductDTO) {
  const offerActive = hasActiveOffer(product);
  if (!offerActive) return null;

  const min = Number(product.minPurchaseQty ?? 0);
  const step = Number(product.qtyStep ?? 0);
  const unit = product.unitType ?? "PER_KG";

  if (unit === "PER_KG" && min >= 2 && step >= 2) {
    return `Promo por ${min} kg`;
  }

  if (unit === "PER_UNIT" && min >= 2 && step >= 1) {
    return `Promo por ${min} un`;
  }

  return null;
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const [imgError, setImgError] = useState(false);

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

  const initialQty = getInitialQty(product);
  const offerQtyLabel = getOfferQtyLabel(product);
  const referencePriceLabel = getReferencePriceLabel({
    priceCents: finalPrice,
    unitType: product.unitType ?? "PER_KG",
    netWeightGr: product.netWeightGr,
    netVolumeMl: product.netVolumeMl,
  });

  function wouldExceedStock(addQty: number): boolean {
    const stock = product.stock ?? 0;
    if (stock <= 0) return true;
    const existing = cartItems.find((i) => i.id === product.id);
    const existingQty = existing?.quantity ?? 0;
    const totalQty = existingQty + addQty;
    // stock is stored in grams for PER_KG, units for PER_UNIT
    const totalRaw =
      (product.unitType ?? "PER_KG") === "PER_KG"
        ? Math.round(totalQty * 1000)
        : Math.round(totalQty);
    return totalRaw > stock;
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canBuy) return toast.error("Producto sin stock");
    if (wouldExceedStock(initialQty)) return toast.error("No hay más stock disponible");

    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: finalPrice,
      quantity: initialQty,
      unitType: product.unitType ?? "PER_KG",
      image: product.image ?? undefined,
      vatRate,
    });

    toast.success(
      `${product.name} agregado al carrito${
        (product.unitType ?? "PER_KG") === "PER_KG"
          ? ` (${initialQty} kg)`
          : ` (${initialQty} un)`
      }`
    );
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canBuy) return toast.error("Producto sin stock");
    if (wouldExceedStock(initialQty)) return toast.error("No hay más stock disponible");

    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: finalPrice,
      quantity: initialQty,
      unitType: product.unitType ?? "PER_KG",
      image: product.image ?? undefined,
      vatRate,
    });

    toast.success("Producto agregado, redirigiendo al checkout...");
    setTimeout(() => router.push("/checkout"), 450);
  };

  return (
    <Link href={`/productos/${product.slug}`} className="block h-full">
      <article
        className="
          group h-full flex flex-col overflow-hidden
          border border-iron hover:border-primary/60
          bg-card
          transition-shadow duration-200 hover:shadow-glow-red-sm
          rounded-sm
        "
      >
        {/* Image */}
        <div className="relative bg-charcoal overflow-hidden h-[200px] md:h-[220px]">
          {product.image && !imgError ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover object-[center_30%] transition-all duration-300 group-hover:scale-[1.03] group-hover:brightness-110"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ShoppingCart className="h-14 w-14" />
            </div>
          )}

          {offerActive && (
            <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1">
              <Badge className="bg-blood hover:bg-blood-dark text-white rounded-none px-2 py-0.5 text-[10px] uppercase tracking-wide shadow-md">
                <Tag className="h-3 w-3 mr-1" />
                Oferta
              </Badge>

              {discount !== null && (
                <Badge className="bg-black text-white font-bold rounded-none px-2 py-0.5 text-[10px] shadow-md">
                  -{discount}%
                </Badge>
              )}
            </div>
          )}

          {product.stock > 0 && product.stock <= 10 && (
            <Badge className="absolute top-2 left-2 z-20 bg-amber-500 hover:bg-amber-600 text-white text-[11px] px-2 py-0.5 rounded-none">
              Últimas unidades
            </Badge>
          )}

          {product.stock <= 0 && (
            <Badge className="absolute top-2 left-2 z-20 bg-blood hover:bg-blood-dark text-white text-[11px] px-2 py-0.5 rounded-none">
              Agotado
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="p-3 flex-1 flex flex-col gap-1.5">
          <h3 className="font-sans font-semibold text-[13px] md:text-[15px] leading-snug line-clamp-2 text-foreground">
            {product.name}
          </h3>

          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[34px]">
            {product.description?.trim() || " "}
          </p>

          {offerQtyLabel ? (
            <p className="text-xs font-medium text-primary">
              {offerQtyLabel}
            </p>
          ) : null}

          <div className="flex flex-col gap-0.5">
            <div className="leading-tight">
              {offerActive && finalPrice !== product.price ? (
                <>
                  <span className="block text-xs text-muted-foreground line-through">
                    {formatPrice(product.price)}
                  </span>
                  <span className="block font-display text-3xl text-primary leading-none">
                    {formatPrice(finalPrice)}
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-xs text-muted-foreground">{" "}</span>
                  <span className="block font-display text-3xl text-primary leading-none">
                    {formatPrice(product.price)}
                  </span>
                </>
              )}
            </div>

            {product.measurementUnit && product.unitMultiplier != null ? (
              <UnitPriceTag
                priceCents={finalPrice}
                measurementUnit={product.measurementUnit}
                unitMultiplier={product.unitMultiplier}
              />
            ) : referencePriceLabel ? (
              <span className="text-xs text-muted-foreground">
                {referencePriceLabel}
              </span>
            ) : null}

            <span className="text-[11px] text-muted-foreground leading-tight lowercase">
              precio sin impuestos nacionales: {formatPrice(netPrice)}
            </span>
          </div>

          <div className="mt-auto" />
        </div>

        {/* Footer buttons */}
        <div className="p-3 pt-0 flex flex-col gap-2">
          <Button
            onClick={handleAddToCart}
            disabled={!canBuy}
            className="w-full rounded-none border-primary text-primary hover:bg-primary hover:text-primary-foreground"
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
            className="w-full rounded-none bg-primary hover:bg-blood-dark text-primary-foreground font-semibold"
            size="lg"
            type="button"
          >
            <Zap className="mr-2 h-4 w-4" />
            Comprar ahora
          </Button>
        </div>
      </article>
    </Link>
  );
}
