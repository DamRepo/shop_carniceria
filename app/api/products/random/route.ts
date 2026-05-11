import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function stockFromDb(unitType: "PER_KG" | "PER_UNIT", stock: number) {
  if (!Number.isFinite(stock) || stock < 0) return 0;
  if (unitType === "PER_UNIT") return stock;
  return stock / 1000;
}

export const revalidate = 120; // 2 minutos — suficiente variedad sin query en cada visita

export async function GET() {
  try {
    const now = new Date();

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        OR: [
          { isOnSale: false },
          { isOnSale: true, saleEndDate: { gt: now } },
        ],
      },
      take: 50, // limitar pool del que se saca el random — evita traer tabla entera
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        price: true,
        stock: true,
        unitType: true,
        netWeightGr: true,
        netVolumeMl: true,
        measurementUnit: true,
        unitMultiplier: true,
        brand: true,
        vatRate: true,
        isOnSale: true,
        salePrice: true,
        saleEndDate: true,
        discountPercent: true,
        isFeatured: true,
        isActive: true,
        categoryId: true,
        category: {
          select: { id: true, name: true, slug: true, vatRate: true },
        },
      },
    });

    // Random real
    const shuffled = [...products].sort(() => Math.random() - 0.5);
    const randomProducts = shuffled.slice(0, 6);

    const normalizedProducts = randomProducts.map((product) => ({
      ...product,

      // stock correcto para frontend
      stock: stockFromDb(product.unitType, product.stock),

      
      isOnSale:
        product.isOnSale &&
        (!product.saleEndDate || product.saleEndDate > now),
    }));

    return NextResponse.json(normalizedProducts);
  } catch (error) {
    console.error("Error al obtener productos aleatorios para home:", error);

    return NextResponse.json(
      { error: "Error al obtener productos aleatorios" },
      { status: 500 }
    );
  }
}