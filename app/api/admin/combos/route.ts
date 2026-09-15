import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadImages } from "@/lib/uploads/upload-images";
import { COMBO_MIN_ITEMS, COMBO_MAX_ITEMS, type ComboPriceType } from "@/lib/combos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COMBO_IMAGE_FOLDER = "carniceria/combos";

/* =========================
   Helpers
   ========================= */
function boolVal(v: FormDataEntryValue | null) {
  return String(v) === "true";
}

function strVal(v: FormDataEntryValue | null) {
  return String(v ?? "").trim();
}

function numVal(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  if (!s) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function parsePriceType(v: FormDataEntryValue | null): ComboPriceType | null {
  const s = String(v ?? "").trim();
  if (s === "FIXED" || s === "PERCENTAGE_DISCOUNT") return s;
  return null;
}

type ParsedComboItem = { productId: string; quantity: number };

function parseItems(v: FormDataEntryValue | null): ParsedComboItem[] | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;

  const items: ParsedComboItem[] = [];
  for (const entry of parsed) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as Record<string, unknown>).productId !== "string" ||
      typeof (entry as Record<string, unknown>).quantity !== "number"
    ) {
      return null;
    }
    const productId = (entry as { productId: string }).productId.trim();
    const quantity = Math.floor((entry as { quantity: number }).quantity);
    if (!productId || !Number.isFinite(quantity) || quantity <= 0) return null;
    items.push({ productId, quantity });
  }

  return items;
}

async function validateItems(
  items: ParsedComboItem[] | null
): Promise<{ error: string } | { items: ParsedComboItem[] }> {
  if (!items) {
    return { error: "Se requiere la lista de productos del combo (items)" };
  }

  if (items.length < COMBO_MIN_ITEMS || items.length > COMBO_MAX_ITEMS) {
    return {
      error: `Un combo debe tener entre ${COMBO_MIN_ITEMS} y ${COMBO_MAX_ITEMS} productos`,
    };
  }

  const ids = items.map((i) => i.productId);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    return { error: "No se puede repetir el mismo producto dos veces en un combo" };
  }

  const existing = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });

  if (existing.length !== uniqueIds.size) {
    return { error: "Uno o más productos seleccionados no existen" };
  }

  return { items };
}

const COMBO_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  imageUrl: true,
  stock: true,
  priceType: true,
  priceValue: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      productId: true,
      quantity: true,
      product: {
        select: { id: true, name: true, slug: true, image: true, price: true },
      },
    },
  },
} as const;

/* =========================
   GET /api/admin/combos
   ========================= */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const combos = await prisma.combo.findMany({
      orderBy: { createdAt: "desc" },
      select: COMBO_SELECT,
    });

    return NextResponse.json(combos);
  } catch (error) {
    console.error("Error fetching combos:", error);
    return NextResponse.json({ error: "Error al obtener combos" }, { status: 500 });
  }
}

/* =========================
   POST /api/admin/combos
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
    const descriptionRaw = strVal(form.get("description"));
    const description = descriptionRaw || null;

    const priceType = parsePriceType(form.get("priceType"));
    const priceValueARS = numVal(form.get("priceValue"));
    const stockRaw = numVal(form.get("stock"));
    const isActive = boolVal(form.get("isActive"));

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios (name/slug)" },
        { status: 400 }
      );
    }

    if (!priceType) {
      return NextResponse.json(
        { error: "priceType inválido (FIXED | PERCENTAGE_DISCOUNT)" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(priceValueARS) || priceValueARS <= 0) {
      return NextResponse.json({ error: "priceValue inválido" }, { status: 400 });
    }

    if (priceType === "PERCENTAGE_DISCOUNT" && priceValueARS > 100) {
      return NextResponse.json(
        { error: "El porcentaje de descuento no puede ser mayor a 100" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(stockRaw) || stockRaw < 0) {
      return NextResponse.json({ error: "Stock inválido" }, { status: 400 });
    }
    const stock = Math.max(0, Math.floor(stockRaw));

    const itemsResult = await validateItems(parseItems(form.get("items")));
    if ("error" in itemsResult) {
      return NextResponse.json({ error: itemsResult.error }, { status: 400 });
    }

    const slugExists = await prisma.combo.findUnique({ where: { slug } });
    if (slugExists) {
      return NextResponse.json({ error: "El slug ya existe" }, { status: 400 });
    }

    let imageUrl: string | null = null;
    const imageEntry = form.get("image");
    if (imageEntry instanceof File && imageEntry.size > 0) {
      const [uploaded] = await uploadImages([imageEntry], COMBO_IMAGE_FOLDER);
      imageUrl = uploaded.secureUrl;
    }

    // priceValue: FIXED se ingresa en ARS -> centavos. PERCENTAGE_DISCOUNT ya es un porcentaje entero.
    const priceValue =
      priceType === "FIXED" ? Math.round(priceValueARS * 100) : Math.round(priceValueARS);

    const created = await prisma.combo.create({
      data: {
        name,
        slug,
        description,
        imageUrl,
        stock,
        priceType,
        priceValue,
        isActive,
        items: {
          create: itemsResult.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
      },
      select: COMBO_SELECT,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating combo:", error);
    return NextResponse.json({ error: "Error al crear combo" }, { status: 500 });
  }
}
