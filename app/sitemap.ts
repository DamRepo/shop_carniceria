import { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://carniceriaelnegro.com";

// Rutas estáticas públicas con sus prioridades y frecuencia de cambio
const staticRoutes: MetadataRoute.Sitemap = [
  { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
  { url: `${BASE_URL}/carniceria`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
  { url: `${BASE_URL}/elaborados`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
  { url: `${BASE_URL}/minimercado`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
  { url: `${BASE_URL}/fruteria-y-verduleria`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
  { url: `${BASE_URL}/ofertas`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  { url: `${BASE_URL}/productos`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  { url: `${BASE_URL}/sobre-nosotros`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE_URL}/preguntas-frecuentes`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE_URL}/terminos-y-condiciones`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/politica-de-privacidad`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/arrepentimiento`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/soporte`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Productos activos con su última actualización
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE_URL}/productos/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes];
}