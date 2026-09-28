import { prisma } from "@/lib/db";
import { HomeHeroBanner } from "@/components/home-hero-banner";
import { HomeCategoryShowcase } from "@/components/home-category-showcase";
import { getOrderProcessingStatus } from "@/lib/business-hours";
import { getStoreHours } from "@/lib/business-hours-server";
import { HomeClient } from "./HomeClient";

// El estado "Abierto/Cerrado ahora" depende de la hora: sin esto la página se
// prerenderiza en el build y el estado queda congelado.
export const revalidate = 60;

const HOME_CATEGORY_SLUGS = [
  "carniceria",
  "embutidos",
  "pollo",
  "elaborados",
  "minimercado",
  "fruteria-y-verduleria",
];

export default async function HomePage() {
  const categories = await prisma.category.findMany({
    where: { slug: { in: HOME_CATEGORY_SLUGS } },
    select: { slug: true },
  });
  const existingSlugs = categories.map((c) => c.slug);
  const orderStatus = getOrderProcessingStatus(new Date(), await getStoreHours());

  return (
    <div className="flex flex-col">
      <HomeHeroBanner />
      <HomeCategoryShowcase existingSlugs={existingSlugs} />
      <HomeClient orderStatus={orderStatus} />
    </div>
  );
}
