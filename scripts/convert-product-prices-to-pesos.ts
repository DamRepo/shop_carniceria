import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, price: true, salePrice: true },
  });

  let changed = 0;

  for (const p of products) {
    const nextPrice = Math.round((p.price ?? 0) / 100);
    const nextSalePrice =
      p.salePrice == null ? null : Math.round(p.salePrice / 100);

    await prisma.product.update({
      where: { id: p.id },
      data: { price: nextPrice, salePrice: nextSalePrice },
    });

    changed++;
  }

  console.log(`OK. Productos actualizados: ${changed}`);
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
