"use client";

/**
 * Card exclusiva para la sección "Ofertas de hoy" de la Home.
 * NO es un reemplazo de ProductCard (components/product-card.tsx) — ese
 * componente se sigue usando en el resto del sitio (catálogo, destacados,
 * lo más elegido, detalle de producto, etc.) y no se toca.
 *
 * Composición visual siguiendo el boceto: badge de descuento (o "Más
 * vendido") sólido arriba a la izquierda de la imagen, precio anterior
 * tachado + precio actual grande en rojo, texto "Ahorrás $X", y botón
 * "Agregar" sólido de ancho completo.
 */

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Tag } from "lucide-react";
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

interface OfferProductDTO {
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
  isFeatured?: boolean;

  minPurchaseQty?: number | null;
  qtyStep?: number | null;
  maxPurchaseQty?: number | null;
  allowsDecimals?: boolean;

  measurementUnit?: string | null;
  unitMultiplier?: number | null;
}

interface OfferCardProps {
  product: OfferProductDTO;
}

function hasActiveOffer(p: OfferProductDTO) {
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

function getInitialQty(product: OfferProductDTO) {
  const offerActive = hasActiveOffer(product);
  if (!offerActive) return 1;

  const min = Number(product.minPurchaseQty ?? 1);
  return Number.isFinite(min) && min > 0 ? min : 1;
}

function getOfferQtyLabel(product: OfferProductDTO) {
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

export function OfferCard({ product }: OfferCardProps) {
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

  const savings =
    offerActive && finalPrice < product.price ? product.price - finalPrice : null;

  // Badge principal: % de descuento si se puede calcular, si no "Más vendido"
  // para productos destacados dentro de la sección de ofertas (ver boceto).
  const badgeLabel = discount !== null ? `-${discount}%` : product.isFeatured ? "Más vendido" : null;

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
    const existing = cartItems.find(
      (i) => i.type === "product" && i.productId === product.id
    );
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
      type: "product",
      productId: product.id,
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

  return (
    <Link href={`/productos/${product.slug}`} className="block h-full">
      <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow duration-200 hover:shadow-md">
        {/* Imagen */}
        <div className="relative h-[150px] overflow-hidden bg-muted sm:h-[170px]">
          {product.image && !imgError ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover object-[center_30%] transition-transform duration-300 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12" />
            </div>
          )}

          {/* Badge principal: descuento o "Más vendido" */}
          {(offerActive || product.stock <= 0) && (
            <div className="absolute left-2 top-2 z-20 flex flex-col items-start gap-1">
              {offerActive && (
                <Badge className="rounded-sm bg-foreground/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-background shadow">
                  <Tag className="mr-1 h-2.5 w-2.5" />
                  Oferta
                </Badge>
              )}
              {badgeLabel && (
                <Badge className="rounded-md bg-primary px-2 py-1 text-xs font-bold text-primary-foreground shadow-md">
                  {badgeLabel}
                </Badge>
              )}
              {product.stock <= 0 && (
                <Badge className="rounded-md bg-blood-dark px-2 py-0.5 text-[11px] text-white shadow-md">
                  Agotado
                </Badge>
              )}
            </div>
          )}

          {/* Últimas unidades */}
          {product.stock > 0 && product.stock <= 10 && (
            <div className="absolute right-2 top-2 z-20">
              <Badge className="rounded-md bg-amber-500 px-2 py-0.5 text-[11px] text-white shadow-md">
                Últimas unidades
              </Badge>
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="flex flex-1 flex-col gap-1 p-3">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {product.name}
          </h3>

          {offerQtyLabel ? (
            <p className="text-xs font-medium text-primary">{offerQtyLabel}</p>
          ) : null}

          <div className="mt-0.5 leading-tight">
            {offerActive && finalPrice !== product.price && (
              <span className="block text-xs text-muted-foreground line-through">
                {formatPrice(product.price)}
              </span>
            )}
            <span className="block font-display text-2xl leading-none text-primary">
              {formatPrice(finalPrice)}
            </span>
          </div>

          {savings !== null && (
            <p className="text-sm font-semibold text-primary">
              Ahorrás {formatPrice(savings)}
            </p>
          )}

          {product.measurementUnit && product.unitMultiplier != null ? (
            <UnitPriceTag
              priceCents={finalPrice}
              measurementUnit={product.measurementUnit}
              unitMultiplier={product.unitMultiplier}
            />
          ) : referencePriceLabel ? (
            <span className="text-xs text-muted-foreground">{referencePriceLabel}</span>
          ) : null}

          <span className="text-[11px] leading-tight text-muted-foreground lowercase">
            precio sin impuestos nacionales: {formatPrice(netPrice)}
          </span>

          <div className="mt-auto" />
        </div>

        {/* Botón */}
        <div className="p-3 pt-0">
          <Button
            onClick={handleAddToCart}
            disabled={!canBuy}
            className="w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            size="lg"
            type="button"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Agregar
          </Button>
        </div>
      </article>
    </Link>
  );
}
