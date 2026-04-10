const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://carniceriaelnegro.com";

interface ProductJsonLdProps {
  name: string;
  description?: string | null;
  image?: string | null;
  /** Precio en centavos */
  price: number;
  /** Precio de oferta en centavos (solo si isOnSale) */
  salePrice?: number | null;
  stock: number;
  slug: string;
}

export function ProductJsonLd({
  name,
  description,
  image,
  price,
  salePrice,
  stock,
  slug,
}: ProductJsonLdProps) {
  const hasOffer =
    typeof salePrice === "number" && salePrice > 0 && salePrice < price;
  const effectivePriceCents = hasOffer ? (salePrice as number) : price;
  const effectivePrice = (effectivePriceCents / 100).toFixed(2);

  const priceValidUntil = new Date();
  priceValidUntil.setDate(priceValidUntil.getDate() + 7);
  const priceValidUntilStr = priceValidUntil.toISOString().split("T")[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    offers: {
      "@type": "Offer",
      price: effectivePrice,
      priceCurrency: "ARS",
      availability:
        stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `${BASE_URL}/productos/${slug}`,
      priceValidUntil: priceValidUntilStr,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
