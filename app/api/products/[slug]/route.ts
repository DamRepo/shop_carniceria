import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type IdRow = { id: string };

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params?.slug;

    if (!slug) {
      return NextResponse.json({ error: "Slug es requerido" }, { status: 400 });
    }

    // ✅ SELECT explícito: asegura category.vatRate SIEMPRE
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
            vatRate: true, // ✅ CLAVE
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
    const parentId = product.category?.parentId ?? null;

    // 2) Si tiene madre, buscamos categorías hermanas (misma madre)
    let siblingCategoryIds: string[] = [];
    if (parentId) {
      const siblings = (await prisma.category.findMany({
        where: { parentId },
        select: { id: true },
      })) as IdRow[];

      siblingCategoryIds = siblings.map((c: IdRow) => c.id);
    }

    // 3) Relacionados: misma categoría + (opcional) hermanas
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

      // ✅ SELECT explícito: asegura related[].category.vatRate
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,

        unitType: true,
        price: true,
        stock: true,

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
            vatRate: true, // ✅ CLAVE
          },
        },
      },
    });

    return NextResponse.json({ product, related });
  } catch (error) {
    console.error("Error fetching product detail:", error);
    return NextResponse.json(
      { error: "Error al obtener detalle del producto" },
      { status: 500 }
    );
  }
}