import type { Metadata } from "next";
import { cache } from "react";
import { prisma } from "@/lib/db";
import ProductDetailClient from "./ProductDetailClient";
import { ProductJsonLd } from "@/components/ProductJsonLd";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://carniceriaelnegro.com";

type Props = { params: { slug: string } };

const getProductSeo = cache((slug: string) =>
  prisma.product.findFirst({
    where: { slug, isActive: true },
    select: {
      name: true,
      description: true,
      image: true,
      slug: true,
      price: true,
      salePrice: true,
      isOnSale: true,
      stock: true,
    },
  })
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductSeo(params.slug);
  if (!p) return { title: "Producto no encontrado" };

  return {
    title: p.name,
    description:
      p.description ??
      `Comprá ${p.name} online y retirá en el día en Carnicería El Negro, Feliciano.`,
    openGraph: {
      title: p.name,
      description: p.description ?? undefined,
      url: `/productos/${p.slug}`,
      images: p.image
        ? [{ url: p.image, width: 800, height: 800, alt: p.name }]
        : undefined,
    },
    alternates: {
      canonical: `/productos/${p.slug}`,
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const p = await getProductSeo(params.slug);

  return (
    <>
      {p && (
        <ProductJsonLd
          name={p.name}
          description={p.description}
          image={p.image}
          price={p.price}
          salePrice={p.isOnSale ? p.salePrice : null}
          stock={p.stock}
          slug={p.slug}
        />
      )}
      <ProductDetailClient slug={params.slug} />
    </>
  );
}
