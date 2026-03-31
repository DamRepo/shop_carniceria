import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
type ProductWhereInput = Record<string, unknown>;

export const runtime = "nodejs";
export const revalidate = 0;

const ALLOWED_SECTIONS = new Set([
  "minimercado",
  "carniceria",
  "elaborados",
  "fruteria-y-verduleria",
]);

function stockFromDb(_unitType: "PER_KG" | "PER_UNIT", stock: number) {
  if (!Number.isFinite(stock) || stock < 0) return 0;
  return stock;
}

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

    const where: ProductWhereInput = {};
    if (onlyActive) where.isActive = true;

    if (onSale) {
      const now = new Date();
      where.isOnSale = true;

      const rule: ProductWhereInput = {
        OR: [{ saleEndDate: null }, { saleEndDate: { gt: now } }],
      };

      if (where.AND) {
        where.AND = Array.isArray(where.AND)
          ? [...where.AND, rule]
          : [where.AND, rule];
      } else {
        where.AND = [rule];
      }
    }

    if (featured) where.isFeatured = true;

    if (categorySlug && categorySlug !== "todos") {
      where.category = { slug: categorySlug };
    } else if (section) {
      if (!ALLOWED_SECTIONS.has(section)) {
        return NextResponse.json([], { status: 200 });
      }

      // Una sola query: trae la categoría raíz con sus hijas directas
      const root = await prisma.category.findUnique({
        where: { slug: section },
        select: { id: true, children: { select: { id: true } } },
      });

      if (!root) return NextResponse.json([], { status: 200 });

      const categoryIds = [root.id, ...root.children.map((c: IdRow) => c.id)];
      where.categoryId = { in: categoryIds };
    }

    const limit = limitParam ? Number(limitParam) : undefined;
    const take =
      Number.isFinite(limit) && (limit as number) > 0
        ? (limit as number)
        : undefined;

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalizedProducts = (products ?? []).map((product: any) => ({
      ...product,
      stock: stockFromDb(product.unitType, product.stock),
    }));

    return NextResponse.json(normalizedProducts);
  } catch (e) {
    console.error("GET /api/products error:", e);
    return NextResponse.json(
      { error: "Error al listar productos" },
      { status: 500 }
    );
  }
}