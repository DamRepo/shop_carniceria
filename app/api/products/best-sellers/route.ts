import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const revalidate = 300; // 5 minutos

type BestSellerRow = {
  productId: string;
  totalQty: number;
};

function stockFromDb(unitType: "PER_KG" | "PER_UNIT", stock: number) {
  if (!Number.isFinite(stock) || stock < 0) return 0;
  if (unitType === "PER_UNIT") return stock;
  return stock / 1000;
}

export async function GET() {
  try {
    const rows: BestSellerRow[] = await prisma.$queryRaw`
      SELECT
        oi."productId",
        SUM(oi.quantity)::float8 AS "totalQty"
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON o.id = oi."orderId"
      WHERE o."paymentStatus" = 'PAID' OR o.status = 'COMPLETED'
      GROUP BY oi."productId"
      ORDER BY "totalQty" DESC
      LIMIT 8
    `;

    if (rows.length === 0) {
      return NextResponse.json([]);
    }

    const productIds = rows.map((r) => r.productId);
    const rankMap = new Map(rows.map((r, i) => [r.productId, i]));

    const now = new Date();

    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sorted = (products as any[])
      .sort((a: any, b: any) => (rankMap.get(a.id) ?? 99) - (rankMap.get(b.id) ?? 99))
      .map((p: any) => ({
        ...p,
        stock: stockFromDb(p.unitType, p.stock),
        isOnSale: p.isOnSale && (!p.saleEndDate || p.saleEndDate > now),
      }));

    return NextResponse.json(sorted);
  } catch (error) {
    console.error("Error al obtener más vendidos:", error);
    return NextResponse.json(
      { error: "Error al obtener más vendidos" },
      { status: 500 }
    );
  }
}
