import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const revalidate = 600; // 10 minutos — detalle de producto es casi estático

type IdRow = { id: string };

function stockFromDb(_unitType: "PER_KG" | "PER_UNIT", stock: number) {
  if (!Number.isFinite(stock) || stock < 0) return 0;
  return stock;
}

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params?.slug;

    if (!slug) {
      return NextResponse.json({ error: "Slug es requerido" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,

        unitType: true,
        price: true,
        stock: true,

        netWeightGr: true,
        netVolumeMl: true,
        measurementUnit: true,
        unitMultiplier: true,
        brand: true,

        vatRate: true,

        isActive: true,
        isFeatured: true,
        isOnSale: true,
        salePrice: true,
        saleEndDate: true,
        discountPercent: true,

        categoryId: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            vatRate: true,
            // Traer categorías hermanas en la misma query, evita un segundo round-trip a DB
            parent: {
              select: {
                children: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const categoryId = product.categoryId;
    // Las hermanas ya vienen incluidas desde el select anterior — sin query extra
    const siblingCategoryIds: string[] =
      product.category?.parent?.children?.map((c: IdRow) => c.id) ?? [];

    const related = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: product.id },
        OR: [
          { categoryId },
          ...(siblingCategoryIds.length > 0
            ? [{ categoryId: { in: siblingCategoryIds } }]
            : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,

        unitType: true,
        price: true,
        stock: true,

        netWeightGr: true,
        netVolumeMl: true,
        measurementUnit: true,
        unitMultiplier: true,
        brand: true,

        vatRate: true,

        isActive: true,
        isFeatured: true,
        isOnSale: true,
        salePrice: true,
        saleEndDate: true,
        discountPercent: true,

        categoryId: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            vatRate: true,
          },
        },
      },
    });

    const normalizedProduct = {
      ...product,
      stock: stockFromDb(product.unitType, product.stock),
    };

    const normalizedRelated = related.map((item) => ({
      ...item,
      stock: stockFromDb(item.unitType, item.stock),
    }));

    return NextResponse.json({
      product: normalizedProduct,
      related: normalizedRelated,
    });
  } catch (error) {
    console.error("Error fetching product detail:", error);
    return NextResponse.json(
      { error: "Error al obtener detalle del producto" },
      { status: 500 }
    );
  }
}