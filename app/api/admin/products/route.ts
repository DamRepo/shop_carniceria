import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadImages } from "@/lib/uploads/upload-images";

export const dynamic = "force-dynamic";

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

    const where: any = {};

    // Filtrar por categoría (opcional)
    if (categorySlug && categorySlug !== "todos") {
      where.category = { slug: categorySlug };
    }

    // Solo filtrar si viene explícitamente "true" o "false"
    if (isActive === "true" || isActive === "false") {
      where.isActive = isActive === "true";
    }

    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products ?? []);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}

/* =========================
   Helpers
   ========================= */
function boolVal(v: FormDataEntryValue | null) {
  return String(v) === "true";
}

function numVal(v: FormDataEntryValue | null) {
  const n = Number(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function strVal(v: FormDataEntryValue | null) {
  return String(v ?? "").trim();
}

type UnitType = "PER_KG" | "PER_UNIT";

function parseUnitType(v: FormDataEntryValue | null): UnitType | null {
  const s = String(v ?? "").trim();
  if (s === "PER_KG" || s === "PER_UNIT") return s;
  return null;
}

function normalizeStock(stockRaw: number, unitType: UnitType) {
  if (!Number.isFinite(stockRaw)) return 0;
  if (unitType === "PER_UNIT") return Math.max(0, Math.floor(stockRaw));
  // PER_KG: permitir decimales
  return Math.max(0, stockRaw);
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

    // ✅ unitType viene del form
    const unitType = parseUnitType(form.get("unitType"));
    if (!unitType) {
      return NextResponse.json(
        { error: "unitType inválido (PER_KG | PER_UNIT)" },
        { status: 400 }
      );
    }

    const priceARS = numVal(form.get("price")); // ARS decimal
    const stockRaw = numVal(form.get("stock"));
    const stock = normalizeStock(stockRaw, unitType);

    const isOnSale = boolVal(form.get("isOnSale"));
    const salePriceStr = strVal(form.get("salePrice"));
    const salePriceARS = salePriceStr ? Number(salePriceStr) : null;

    const saleEndDateStr = strVal(form.get("saleEndDate"));
    const saleEndDate = saleEndDateStr ? new Date(saleEndDateStr) : null;

    const isFeatured = boolVal(form.get("isFeatured"));
    const isActive = boolVal(form.get("isActive"));

    // Validación mínima
    if (!name || !slug || !categoryId) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios (name/slug/categoryId)" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(priceARS) || priceARS <= 0) {
      return NextResponse.json(
        { error: "Precio inválido" },
        { status: 400 }
      );
    }

    // Unicidad slug
    const slugExists = await prisma.product.findUnique({ where: { slug } });
    if (slugExists) {
      return NextResponse.json({ error: "El slug ya existe" }, { status: 400 });
    }

    // Imagen opcional (solo si sube archivo)
    let image: string | null = null;
    const imageEntry = form.get("image");
    if (imageEntry instanceof File && imageEntry.size > 0) {
      // Si Cloudinary no está configurado, esto puede tirar error -> lo capturamos
      const [uploaded] = await uploadImages([imageEntry]);
      image = uploaded.secureUrl;
    }

    // Oferta
    const discountPercent =
      isOnSale && salePriceARS !== null && priceARS > 0
        ? Math.round(((priceARS - salePriceARS) / priceARS) * 100)
        : null;

    const created = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        categoryId,

        unitType: unitType as any,
        stock,

        price: Math.round(priceARS * 100),
        image,

        isOnSale,
        salePrice:
          salePriceARS !== null && Number.isFinite(salePriceARS)
            ? Math.round(salePriceARS * 100)
            : null,
        saleEndDate,
        discountPercent,

        isFeatured,
        isActive,
      },
      include: { category: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Error al crear producto" },
      { status: 500 }
    );
  }
}
