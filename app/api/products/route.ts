import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_SECTIONS = new Set([
  "minimercado",
  "carniceria",
  "elaborados",
  "fruteria-y-verduleria",
]);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const section = searchParams.get("section");
    const categorySlug = searchParams.get("category");
    const onlyActive = searchParams.get("active") !== "false";

    const onSale = searchParams.get("onSale") === "true";
    const featured = searchParams.get("featured") === "true";
    const limitParam = searchParams.get("limit");

    type IdRow = { id: string };

    const where: Prisma.ProductWhereInput = {};
    if (onlyActive) where.isActive = true;

    // ✅ Ofertas: solo si NO vencieron (o si no tienen fecha)
    if (onSale) {
      const now = new Date();
      where.isOnSale = true;

      const rule: Prisma.ProductWhereInput = {
        OR: [{ saleEndDate: null }, { saleEndDate: { gt: now } }],
      };

      // append seguro
      if (where.AND) {
        where.AND = Array.isArray(where.AND) ? [...where.AND, rule] : [where.AND, rule];
      } else {
        where.AND = [rule];
      }
    }

    if (featured) where.isFeatured = true;

    // 1) Filtrar por categoría exacta
    if (categorySlug && categorySlug !== "todos") {
      where.category = { slug: categorySlug };
    }
    // 2) Filtrar por sección raíz + hijas
    else if (section) {
      if (!ALLOWED_SECTIONS.has(section)) {
        return NextResponse.json([], { status: 200 });
      }

      const root = (await prisma.category.findUnique({
        where: { slug: section },
        select: { id: true },
      })) as IdRow | null;

      if (!root) return NextResponse.json([], { status: 200 });

      const children = (await prisma.category.findMany({
        where: { parentId: root.id },
        select: { id: true },
      })) as IdRow[];

      const categoryIds = [root.id, ...children.map((c) => c.id)];
      where.categoryId = { in: categoryIds };
    }

    const limit = limitParam ? Number(limitParam) : undefined;
    const take =
      Number.isFinite(limit) && (limit as number) > 0 ? (limit as number) : undefined;

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...(take ? { take } : {}),

      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,

        unitType: true,
        price: true,
        stock: true,

        // ✅ contenido neto
        netWeightGr: true,
        netVolumeMl: true,

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

    return NextResponse.json(products ?? []);
  } catch (e) {
    console.error("GET /api/products error:", e);
    return NextResponse.json(
      { error: "Error al listar productos" },
      { status: 500 }
    );
  }
}