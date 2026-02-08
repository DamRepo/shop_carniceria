import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadImages } from "@/lib/uploads/upload-images";

export const dynamic = "force-dynamic";

type UnitType = "PER_KG" | "PER_UNIT";

function toBool(v: FormDataEntryValue | null): boolean | undefined {
  if (v === null) return undefined;
  const s = String(v);
  if (s === "true") return true;
  if (s === "false") return false;
  return undefined;
}

function toNumber(v: FormDataEntryValue | null): number | undefined {
  if (v === null) return undefined;
  const n = Number(String(v));
  return Number.isFinite(n) ? n : undefined;
}

function toStr(v: FormDataEntryValue | null): string | undefined {
  if (v === null) return undefined;
  return String(v).trim();
}

function toNullableStr(v: FormDataEntryValue | null): string | null | undefined {
  if (v === null) return undefined;
  const s = String(v).trim();
  return s.length ? s : null;
}

function toUnitType(v: FormDataEntryValue | null): UnitType | undefined {
  if (v === null) return undefined;
  const s = String(v).trim();
  if (s === "PER_KG" || s === "PER_UNIT") return s;
  return undefined;
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const form = await request.formData();

    const name = toStr(form.get("name"));
    const slug = toStr(form.get("slug"));
    const description = toNullableStr(form.get("description"));

    const price = toNumber(form.get("price")); // ARS decimal
    const categoryId = toStr(form.get("categoryId"));
    const stockIncoming = toNumber(form.get("stock"));

    const unitTypeIncoming = toUnitType(form.get("unitType"));

    const isOnSale = toBool(form.get("isOnSale"));
    const salePriceDec = toNumber(form.get("salePrice")); // ARS decimal
    const saleEndDateRaw = toStr(form.get("saleEndDate"));

    const isFeatured = toBool(form.get("isFeatured"));
    const isActive = toBool(form.get("isActive"));

    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
      select: { id: true, slug: true, unitType: true },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    if (slug && slug !== existingProduct.slug) {
      const slugExists = await prisma.product.findUnique({ where: { slug } });
      if (slugExists) {
        return NextResponse.json({ error: "El slug ya existe" }, { status: 400 });
      }
    }

    // ✅ unitType final: si viene, usamos el nuevo; si no, mantenemos el actual
    const finalUnitType: UnitType = unitTypeIncoming ?? (existingProduct.unitType as UnitType);

    // ✅ imagen opcional
    const imageEntry = form.get("image");
    let imageUrlToSave: string | undefined;
    if (imageEntry instanceof File && imageEntry.size > 0) {
      const [uploaded] = await uploadImages([imageEntry]);
      imageUrlToSave = uploaded?.secureUrl;
    }

    // ✅ saleEndDate
    let saleEndDate: Date | null | undefined = undefined;
    if (saleEndDateRaw !== undefined) {
      saleEndDate = saleEndDateRaw ? new Date(saleEndDateRaw) : null;
    }

    // ✅ stock según unidad
    let stockToSave: number | undefined = undefined;
    if (stockIncoming !== undefined) {
      stockToSave =
        finalUnitType === "PER_UNIT"
          ? Math.floor(stockIncoming)
          : stockIncoming; // PER_KG: permitir decimal
    }

    // ✅ discountPercent + limpieza de campos de oferta
    let salePriceToSave: number | null | undefined = undefined;
    let discountPercent: number | null | undefined = undefined;
    let saleEndDateToSave: Date | null | undefined = undefined;

    if (isOnSale === false) {
      // si apagan oferta, limpiamos todo
      salePriceToSave = null;
      discountPercent = null;
      saleEndDateToSave = null;
    } else {
      // si no tocaron isOnSale, no forzamos limpieza
      if (salePriceDec !== undefined) {
        salePriceToSave = salePriceDec ? Math.round(salePriceDec * 100) : null;
      }
      if (saleEndDate !== undefined) {
        saleEndDateToSave = saleEndDate;
      }

      if (
        isOnSale === true &&
        typeof price === "number" &&
        typeof salePriceDec === "number" &&
        price > 0
      ) {
        discountPercent = Math.round(((price - salePriceDec) / price) * 100);
      }
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),

        ...(price !== undefined && { price: Math.round(price * 100) }),
        ...(categoryId !== undefined && { categoryId }),

        ...(imageUrlToSave !== undefined && { image: imageUrlToSave }),

        ...(stockToSave !== undefined && { stock: stockToSave }),

        // ✅ unitType solo si vino o si querés asegurar coherencia siempre
        ...(unitTypeIncoming !== undefined && { unitType: finalUnitType as any }),

        ...(isOnSale !== undefined && { isOnSale }),

        ...(salePriceToSave !== undefined && { salePrice: salePriceToSave }),
        ...(saleEndDateToSave !== undefined && { saleEndDate: saleEndDateToSave }),
        ...(discountPercent !== undefined && { discountPercent }),

        ...(isFeatured !== undefined && { isFeatured }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { category: true },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Error al actualizar producto" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    // soft delete
    await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Producto eliminado exitosamente" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Error al eliminar producto" },
      { status: 500 }
    );
  }
}
