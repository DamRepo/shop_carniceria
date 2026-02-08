import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params?.slug;

    if (!slug) {
      return NextResponse.json({ error: "Slug es requerido" }, { status: 400 });
    }

    // 1) Producto base
    const product = await prisma.product.findUnique({
      where: { slug },
      include: { category: true },
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
      const siblings = await prisma.category.findMany({
        where: { parentId },
        select: { id: true },
      });
      siblingCategoryIds = siblings.map((c) => c.id);
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
      include: { category: true },
      orderBy: { createdAt: "desc" },
      take: 8,
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
