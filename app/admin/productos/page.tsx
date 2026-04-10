import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { ProductosAdminClient } from "./ProductosAdminClient";
import type { ProductDTO, CategoryDTO } from "./ProductosAdminClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type UnitType = "PER_KG" | "PER_UNIT";

function stockFromDb(stock: number, unitType: UnitType): number {
  if (!Number.isFinite(stock) || stock < 0) return 0;
  return unitType === "PER_KG" ? stock / 1000 : stock;
}

interface PageProps {
  searchParams: {
    search?: string;
    category?: string;
    estado?: string;
    oferta?: string;
    stock?: string;
    page?: string;
    orderBy?: string;
    order?: string;
  };
}

export default async function ProductosAdminPage({ searchParams }: PageProps) {
  const search = searchParams.search?.trim() ?? "";
  const category = searchParams.category ?? "";
  const estado = searchParams.estado ?? "";
  const oferta = searchParams.oferta ?? "";
  const stockFilter = searchParams.stock ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const orderBy = searchParams.orderBy ?? "createdAt";
  const order = (searchParams.order ?? "desc") as "asc" | "desc";

  // Validate orderBy to prevent arbitrary fields
  const allowedOrderBy = ["createdAt", "name", "price", "stock"] as const;
  type AllowedOrderBy = (typeof allowedOrderBy)[number];
  const safeOrderBy: AllowedOrderBy = allowedOrderBy.includes(orderBy as AllowedOrderBy)
    ? (orderBy as AllowedOrderBy)
    : "createdAt";

  /* ─── Build Prisma WHERE ─── */
  const conditions: Prisma.ProductWhereInput[] = [];

  if (search) {
    conditions.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { category: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  if (category) {
    conditions.push({
      OR: [
        { category: { slug: category } },
        { category: { parent: { slug: category } } },
      ],
    });
  }

  if (estado === "activo") conditions.push({ isActive: true });
  if (estado === "inactivo") conditions.push({ isActive: false });

  if (oferta === "si") conditions.push({ isOnSale: true });
  if (oferta === "no") conditions.push({ isOnSale: false });

  if (stockFilter === "critico") {
    conditions.push({
      OR: [
        { AND: [{ unitType: "PER_UNIT" }, { stock: { lte: 5, gt: 0 } }] },
        { AND: [{ unitType: "PER_KG" }, { stock: { lte: 5000, gt: 0 } }] },
      ],
    });
  }

  if (stockFilter === "agotado") {
    conditions.push({ stock: { lte: 0 } });
  }

  const where: Prisma.ProductWhereInput =
    conditions.length > 0 ? { AND: conditions } : {};

  const hasFilters = conditions.length > 0;

  /* ─── Parallel queries ─── */
  const [total, rawProducts, categories, brandsRaw] = await Promise.all([
    prisma.product.count({ where }),

    prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, slug: true, vatRate: true, parentId: true },
        },
      },
      orderBy: { [safeOrderBy]: order },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),

    prisma.category.findMany({
      select: { id: true, name: true, slug: true, vatRate: true, parentId: true },
      orderBy: { name: "asc" },
    }),

    prisma.product.findMany({
      where: { brand: { not: null } },
      select: { brand: true },
      distinct: ["brand"],
      orderBy: { brand: "asc" },
    }),
  ]);

  /* ─── Normalize ─── */
  const products: ProductDTO[] = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    categoryId: p.categoryId,
    image: p.image,
    stock: stockFromDb(p.stock, p.unitType as UnitType),
    unitType: p.unitType as UnitType,
    vatRate: p.vatRate,
    isOnSale: p.isOnSale,
    salePrice: p.salePrice,
    saleEndDate: p.saleEndDate ? p.saleEndDate.toISOString() : null,
    discountPercent: p.discountPercent,
    isFeatured: p.isFeatured,
    isActive: p.isActive,
    measurementUnit: p.measurementUnit ?? "unidad",
    unitMultiplier: p.unitMultiplier ?? 1,
    brand: p.brand,
    minPurchaseQty: p.minPurchaseQty,
    qtyStep: p.qtyStep,
    maxPurchaseQty: p.maxPurchaseQty,
    allowsDecimals: p.allowsDecimals ?? false,
    netWeightGr: p.netWeightGr,
    netVolumeMl: p.netVolumeMl,
    createdAt: p.createdAt.toISOString(),
    category: {
      id: p.category.id,
      name: p.category.name,
      slug: p.category.slug,
      vatRate: p.category.vatRate,
      parentId: p.category.parentId,
    },
  }));

  const cats: CategoryDTO[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    vatRate: c.vatRate,
    parentId: c.parentId,
  }));

  const brands: string[] = brandsRaw
    .map((b) => b.brand)
    .filter((b): b is string => b !== null);

  return (
    <ProductosAdminClient
      products={products}
      total={total}
      categories={cats}
      brands={brands}
      currentPage={page}
      pageSize={PAGE_SIZE}
      hasFilters={hasFilters}
      searchTerm={search}
    />
  );
}
