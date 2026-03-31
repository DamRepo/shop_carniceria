import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function stockFromDb(unitType: "PER_KG" | "PER_UNIT", stock: number) {
  if (!Number.isFinite(stock) || stock < 0) return 0;
  if (unitType === "PER_UNIT") return stock;
  return stock / 1000;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;

    if (!slug) {
      return NextResponse.json({ error: "Slug es requerido" }, { status: 400 });
    }

    const currentProduct = await prisma.product.findUnique({
      where: { slug },
      select: { id: true, categoryId: true },
    });

    if (!currentProduct) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const products = await prisma.product.findMany({
      where: {
        id: { not: currentProduct.id },
        isActive: true,
        stock: { gt: 0 },
        categoryId: currentProduct.categoryId, // priorizar misma categoría
      },
      take: 12, // limitar resultados — antes traía toda la tabla
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

    const shuffled = [...products].sort(() => Math.random() - 0.5);
    const randomProducts = shuffled.slice(0, 6);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalizedProducts = (randomProducts as any[]).map((product: any) => ({
      ...product,
      stock: stockFromDb(product.unitType, product.stock),
    }));

    return NextResponse.json(normalizedProducts);
  } catch (error) {
    console.error("Error al obtener productos aleatorios:", error);

    return NextResponse.json(
      { error: "Error al obtener productos aleatorios" },
      { status: 500 }
    );
  }
}