import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadImages } from "@/lib/uploads/upload-images";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type UnitType = "PER_KG" | "PER_UNIT";

/* =========================
   Helpers
   ========================= */
function boolVal(v: FormDataEntryValue | null) {
  return String(v) === "true";
}

function numVal(v: FormDataEntryValue | null) {
  const s0 = String(v ?? "").trim();
  if (!s0) return 0;

  // "1.234,56" => "1234.56"
  const s = s0.includes(",") ? s0.replace(/\./g, "").replace(",", ".") : s0;

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function strVal(v: FormDataEntryValue | null) {
  return String(v ?? "").trim();
}

function parseUnitType(v: FormDataEntryValue | null): UnitType | null {
  const s = String(v ?? "").trim();
  if (s === "PER_KG" || s === "PER_UNIT") return s;
  return null;
}

/**
 * Modelo consistente:
 * - PER_UNIT => stock en unidades enteras
 * - PER_KG   => stock en gramos enteros en DB
 */
function normalizeStock(stockRaw: number, unitType: UnitType) {
  if (!Number.isFinite(stockRaw) || stockRaw < 0) return 0;

  if (unitType === "PER_UNIT") {
    return Math.max(0, Math.floor(stockRaw));
  }

  // El admin carga kg; en DB guardamos gramos enteros
  return Math.max(0, Math.round(stockRaw * 1000));
}

function stockFromDb(unitType: UnitType, stock: number) {
  if (!Number.isFinite(stock) || stock < 0) return 0;

  if (unitType === "PER_UNIT") {
    return stock;
  }

  // En DB está en gramos; al admin le devolvemos kg
  return stock / 1000;
}

/** Parse robusto para datetime-local / ISO */
function parseOptionalDateTime(raw: string): { date: Date | null; error?: string } {
  const s = raw.trim();
  if (!s) return { date: null };

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    return { date: null, error: "saleEndDate inválida" };
  }

  return { date: d };
}

/**
 * IVA opcional por producto:
 * - "" => null (usa categoría)
 * - "0.21" => 0.21
 * - "0.105" => 0.105
 */
function parseVatRate(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;

  if (n === 0.21 || n === 0.105) return n;

  return null;
}

/**
 * Parse opcional para int positivo (gramos/ml)
 * - "" => null
 * - "0" o negativo => null
 * - "250.7" => 250
 */
function parseOptionalPositiveInt(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;

  const int = Math.floor(n);
  if (int <= 0) return null;

  return int;
}

/* =========================
   GET /api/admin/products
   ========================= */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get("category");
    const isActive = searchParams.get("isActive");

    const where: {
      category?: { slug: string };
      isActive?: boolean;
    } = {};

    if (categorySlug && categorySlug !== "todos") {
      where.category = { slug: categorySlug };
    }

    if (isActive === "true" || isActive === "false") {
      where.isActive = isActive === "true";
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        categoryId: true,
        image: true,
        stock: true,
        unitType: true,
        netWeightGr: true,
        netVolumeMl: true,
        vatRate: true,
        isOnSale: true,
        salePrice: true,
        saleEndDate: true,
        discountPercent: true,
        isFeatured: true,
        isActive: true,
        measurementUnit: true,
        unitMultiplier: true,
        brand: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            vatRate: true,
          },
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalizedProducts = (products as any[]).map((product: any) => ({
      ...product,
      stock: stockFromDb(product.unitType as UnitType, product.stock),
    }));

    return NextResponse.json(normalizedProducts);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}

/* =========================
   POST /api/admin/products
   ========================= */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const form = await request.formData();

    const name = strVal(form.get("name"));
    const slug = strVal(form.get("slug"));

    const descriptionRaw = String(form.get("description") ?? "");
    const description = descriptionRaw.trim() ? descriptionRaw.trim() : null;

    const categoryId = strVal(form.get("categoryId"));

    const unitType = parseUnitType(form.get("unitType"));
    if (!unitType) {
      return NextResponse.json(
        { error: "unitType inválido (PER_KG | PER_UNIT)" },
        { status: 400 }
      );
    }

    const measurementUnit = strVal(form.get("measurementUnit")) || "un";
    const unitMultiplierRaw = numVal(form.get("unitMultiplier"));
    const unitMultiplier =
      Number.isFinite(unitMultiplierRaw) && unitMultiplierRaw > 0
        ? unitMultiplierRaw
        : 1;

    const brandRaw = strVal(form.get("brand"));
    const brand = brandRaw || null;

    const netWeightGrRaw = parseOptionalPositiveInt(form.get("netWeightGr"));
    const netVolumeMlRaw = parseOptionalPositiveInt(form.get("netVolumeMl"));

    const netWeightGr = unitType === "PER_UNIT" ? netWeightGrRaw : null;
    const netVolumeMl = unitType === "PER_UNIT" ? netVolumeMlRaw : null;

    if (unitType === "PER_UNIT" && netWeightGr && netVolumeMl) {
      return NextResponse.json(
        {
          error:
            "Cargá solo uno: netWeightGr (gramos) o netVolumeMl (ml), no ambos.",
        },
        { status: 400 }
      );
    }

    const vatRate = parseVatRate(form.get("vatRate"));

    const priceARS = numVal(form.get("price"));
    const stockRaw = numVal(form.get("stock"));

    const maxStock = unitType === "PER_KG" ? 999_999 : 2_000_000;
    if (!Number.isFinite(stockRaw) || stockRaw < 0 || stockRaw > maxStock) {
      return NextResponse.json(
        { error: `Stock inválido (máximo ${maxStock} ${unitType === "PER_KG" ? "kg" : "unidades"})` },
        { status: 400 }
      );
    }

    const stock = normalizeStock(stockRaw, unitType);

    const isOnSale = boolVal(form.get("isOnSale"));
    const salePriceARS = numVal(form.get("salePrice"));

    const saleEndDateStr = strVal(form.get("saleEndDate"));
    const parsed = parseOptionalDateTime(saleEndDateStr);
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const isFeatured = boolVal(form.get("isFeatured"));
    const isActive = boolVal(form.get("isActive"));

    if (!name || !slug || !categoryId) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios (name/slug/categoryId)" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(priceARS) || priceARS <= 0) {
      return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
    }

    const slugExists = await prisma.product.findUnique({ where: { slug } });
    if (slugExists) {
      return NextResponse.json({ error: "El slug ya existe" }, { status: 400 });
    }

    let image: string | null = null;
    const imageEntry = form.get("image");

    if (imageEntry instanceof File && imageEntry.size > 0) {
      const [uploaded] = await uploadImages([imageEntry]);
      image = uploaded.secureUrl;
    }

    const safeSaleEndDate = isOnSale ? parsed.date : null;

    const safeSalePriceCents =
      isOnSale && Number.isFinite(salePriceARS) && salePriceARS > 0
        ? Math.round(salePriceARS * 100)
        : null;

    const priceCents = Math.round(priceARS * 100);

    const discountPercent =
      isOnSale &&
      safeSalePriceCents !== null &&
      priceCents > 0 &&
      safeSalePriceCents < priceCents
        ? Math.round(((priceCents - safeSalePriceCents) / priceCents) * 100)
        : null;

    const created = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        categoryId,
        unitType,
        stock,
        price: priceCents,
        image,
        netWeightGr,
        netVolumeMl,
        vatRate,
        isOnSale,
        salePrice: safeSalePriceCents,
        saleEndDate: safeSaleEndDate,
        discountPercent,
        isFeatured,
        isActive,
        measurementUnit,
        unitMultiplier,
        brand,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        categoryId: true,
        image: true,
        stock: true,
        unitType: true,
        netWeightGr: true,
        netVolumeMl: true,
        vatRate: true,
        isOnSale: true,
        salePrice: true,
        saleEndDate: true,
        discountPercent: true,
        isFeatured: true,
        isActive: true,
        measurementUnit: true,
        unitMultiplier: true,
        brand: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            vatRate: true,
          },
        },
      },
    });

    const normalizedCreated = {
      ...created,
      stock: stockFromDb(created.unitType as UnitType, created.stock),
    };

    return NextResponse.json(normalizedCreated, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Error al crear producto" },
      { status: 500 }
    );
  }
}