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
function toStr(v: FormDataEntryValue | null): string | undefined {
  const s = String(v ?? "").trim();
  return s ? s : undefined;
}

function toNullableStr(v: FormDataEntryValue | null): string | null | undefined {
  if (v === null) return undefined;
  const s = String(v).trim();
  return s ? s : null;
}

function toBool(v: FormDataEntryValue | null): boolean | undefined {
  if (v === null) return undefined;
  const s = String(v).trim();
  if (s === "true") return true;
  if (s === "false") return false;
  return undefined;
}

function toNumber(v: FormDataEntryValue | null): number | undefined {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function toPriceType(v: FormDataEntryValue | null): ComboPriceType | undefined {
  const s = String(v ?? "").trim();
  if (s === "FIXED" || s === "PERCENTAGE_DISCOUNT") return s;
  return undefined;
}

type ParsedComboItem = { productId: string; quantity: number };

function parseItems(v: FormDataEntryValue | null): ParsedComboItem[] | null | undefined {
  if (v === null) return undefined;
  const raw = String(v).trim();
  if (!raw) return undefined;

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
  items: ParsedComboItem[]
): Promise<{ error: string } | { items: ParsedComboItem[] }> {
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
   PATCH /api/admin/combos/[id]
   ========================= */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const existingCombo = await prisma.combo.findUnique({
      where: { id: params.id },
      select: { id: true, slug: true, priceType: true },
    });

    if (!existingCombo) {
      return NextResponse.json({ error: "Combo no encontrado" }, { status: 404 });
    }

    const form = await request.formData();

    const name = toStr(form.get("name"));
    const slug = toStr(form.get("slug"));
    const description = toNullableStr(form.get("description"));
    const priceTypeIncoming = toPriceType(form.get("priceType"));
    const priceValueARSIncoming = toNumber(form.get("priceValue"));
    const stockIncoming = toNumber(form.get("stock"));
    const isActive = toBool(form.get("isActive"));

    const itemsIncoming = parseItems(form.get("items"));
    if (itemsIncoming === null) {
      return NextResponse.json({ error: "items inválido" }, { status: 400 });
    }

    let itemsToSave: ParsedComboItem[] | undefined;
    if (itemsIncoming !== undefined) {
      const itemsResult = await validateItems(itemsIncoming);
      if ("error" in itemsResult) {
        return NextResponse.json({ error: itemsResult.error }, { status: 400 });
      }
      itemsToSave = itemsResult.items;
    }

    if (slug && slug !== existingCombo.slug) {
      const slugExists = await prisma.combo.findUnique({ where: { slug } });
      if (slugExists) {
        return NextResponse.json({ error: "El slug ya existe" }, { status: 400 });
      }
    }

    const finalPriceType: ComboPriceType = priceTypeIncoming ?? existingCombo.priceType;

    let priceValueToSave: number | undefined;
    if (priceValueARSIncoming !== undefined) {
      if (priceValueARSIncoming <= 0) {
        return NextResponse.json({ error: "priceValue inválido" }, { status: 400 });
      }
      if (finalPriceType === "PERCENTAGE_DISCOUNT" && priceValueARSIncoming > 100) {
        return NextResponse.json(
          { error: "El porcentaje de descuento no puede ser mayor a 100" },
          { status: 400 }
        );
      }
      priceValueToSave =
        finalPriceType === "FIXED"
          ? Math.round(priceValueARSIncoming * 100)
          : Math.round(priceValueARSIncoming);
    } else if (priceTypeIncoming && priceTypeIncoming !== existingCombo.priceType) {
      return NextResponse.json(
        { error: "Al cambiar priceType hay que reenviar priceValue" },
        { status: 400 }
      );
    }

    let stockToSave: number | undefined;
    if (stockIncoming !== undefined) {
      if (stockIncoming < 0) {
        return NextResponse.json({ error: "Stock inválido" }, { status: 400 });
      }
      stockToSave = Math.max(0, Math.floor(stockIncoming));
    }

    let imageUrlToSave: string | undefined;
    const imageEntry = form.get("image");
    if (imageEntry instanceof File && imageEntry.size > 0) {
      const [uploaded] = await uploadImages([imageEntry], COMBO_IMAGE_FOLDER);
      imageUrlToSave = uploaded?.secureUrl;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (itemsToSave) {
        await tx.comboItem.deleteMany({ where: { comboId: params.id } });
        await tx.comboItem.createMany({
          data: itemsToSave.map((i) => ({
            comboId: params.id,
            productId: i.productId,
            quantity: i.quantity,
          })),
        });
      }

      return tx.combo.update({
        where: { id: params.id },
        data: {
          ...(name !== undefined && { name }),
          ...(slug !== undefined && { slug }),
          ...(description !== undefined && { description }),
          ...(priceTypeIncoming !== undefined && { priceType: priceTypeIncoming }),
          ...(priceValueToSave !== undefined && { priceValue: priceValueToSave }),
          ...(stockToSave !== undefined && { stock: stockToSave }),
          ...(imageUrlToSave !== undefined && { imageUrl: imageUrlToSave }),
          ...(isActive !== undefined && { isActive }),
        },
        select: COMBO_SELECT,
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating combo:", error);
    return NextResponse.json({ error: "Error al actualizar combo" }, { status: 500 });
  }
}

/* =========================
   DELETE /api/admin/combos/[id]
   (soft delete)
   ========================= */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const existingCombo = await prisma.combo.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!existingCombo) {
      return NextResponse.json({ error: "Combo no encontrado" }, { status: 404 });
    }

    await prisma.combo.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({
      ok: true,
      mode: "soft",
      message: "Combo desactivado.",
    });
  } catch (error) {
    console.error("Error deleting combo:", error);
    return NextResponse.json({ error: "Error al eliminar combo" }, { status: 500 });
  }
}
