import { prisma } from "@/lib/db";
import { CombosAdminClient } from "./CombosAdminClient";
import type { ComboDTO, ProductOptionDTO } from "./CombosAdminClient";

export const dynamic = "force-dynamic";

export default async function CombosAdminPage() {
  const [combosRaw, productsRaw] = await Promise.all([
    prisma.combo.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, image: true, price: true },
            },
          },
        },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, image: true, price: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const combos: ComboDTO[] = combosRaw.map((combo) => ({
    id: combo.id,
    name: combo.name,
    slug: combo.slug,
    description: combo.description,
    imageUrl: combo.imageUrl,
    stock: combo.stock,
    priceType: combo.priceType,
    priceValue: combo.priceValue,
    isActive: combo.isActive,
    createdAt: combo.createdAt.toISOString(),
    items: combo.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      product: item.product,
    })),
  }));

  const products: ProductOptionDTO[] = productsRaw;

  return <CombosAdminClient combos={combos} products={products} />;
}
