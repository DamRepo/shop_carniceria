import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_SECTIONS = new Set([
  "minimercado",
  "carniceria",
  "elaborados",
  "fruteria-y-verduleria",
]);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const section = searchParams.get("section"); // minimercado | fruteria y carniceria | elaborados | carniceria
    const categorySlug = searchParams.get("category"); // slug de categoría (hija o raíz)
    const onlyActive = searchParams.get("active") !== "false"; // default true

    const onSale = searchParams.get("onSale") === "true";
    const featured = searchParams.get("featured") === "true";
    const limitParam = searchParams.get("limit");

    const where: any = {};
    if (onlyActive) where.isActive = true;
    if (onSale) where.isOnSale = true;
    if (featured) where.isFeatured = true;

    // 1) categorySlug tiene prioridad (filtro exacto)
    if (categorySlug && categorySlug !== "todos") {
      where.category = { slug: categorySlug };
    }
    // 2) si no hay categorySlug, filtramos por sección (raíz + hijas)
    else if (section) {
      if (!ALLOWED_SECTIONS.has(section)) {
        return NextResponse.json([], { status: 200 });
      }

      const root = await prisma.category.findUnique({
        where: { slug: section },
        select: { id: true },
      });

      if (!root) return NextResponse.json([], { status: 200 });

      const children = await prisma.category.findMany({
        where: { parentId: root.id },
        select: { id: true },
      });

      const categoryIds = [root.id, ...children.map((c) => c.id)];
      where.categoryId = { in: categoryIds };
    }

    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const take = Number.isFinite(limit) && limit! > 0 ? limit : undefined;

    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
      ...(take ? { take } : {}),
    });

    return NextResponse.json(products ?? []);
  } catch (e) {
    console.error("GET /api/products error:", e);
    return NextResponse.json(
      { error: "Error al listar productos" },
      { status: 500 },
    );
  }
}
