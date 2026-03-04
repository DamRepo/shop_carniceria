import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadImages } from "@/lib/uploads/upload-images";

/** Ajustá este type si ya lo tenés declarado en otro lado */
type UnitType = "PER_KG" | "PER_UNIT";

/* =========================
   Helpers
   ========================= */
function toStr(v: FormDataEntryValue | null): string | undefined {
  const s = String(v ?? "").trim();
  return s ? s : undefined;
}

function toNullableStr(v: FormDataEntryValue | null): string | null | undefined {
  if (v === null) return undefined; // no vino el campo
  const s = String(v).trim();
  return s ? s : null; // vino vacío => null
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

  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function toUnitType(v: FormDataEntryValue | null): UnitType | undefined {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  if (s === "PER_KG" || s === "PER_UNIT") return s;
  return undefined;
}

/** ✅ Dinero ARS -> CENTAVOS (Int) */
function toMoneyCents(v: FormDataEntryValue | null): number | undefined {
  const s0 = String(v ?? "").trim();
  if (!s0) return undefined;

  // "1.234,56" => "1234.56"
  const s = s0.includes(",") ? s0.replace(/\./g, "").replace(",", ".") : s0;

  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;

  return Math.round(n * 100);
}

/**
 * ✅ IVA opcional por producto:
 * - si no vino el campo => undefined (no tocar)
 * - si vino vacío => null (usar categoría)
 * - si vino "0.21" => 0.21
 * - si vino "0.105" => 0.105
 */
function toVatRate(v: FormDataEntryValue | null): number | null | undefined {
  if (v === null) return undefined; // no vino
  const s = String(v).trim();
  if (!s) return null; // vino vacío => null

  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;

  if (n === 0.21 || n === 0.105) return n;

  return undefined;
}

/**
 * ✅ Entero positivo opcional (gramos/ml)
 * - si no vino => undefined (no tocar)
 * - si vino vacío => null (limpiar)
 * - si vino <=0 => null
 * - si vino decimal => floor
 */
function toOptionalPositiveInt(
  v: FormDataEntryValue | null
): number | null | undefined {
  if (v === null) return undefined; // no vino => no tocar

  const s = String(v).trim();
  if (!s) return null; // vino vacío => limpiar

  const n = Number(s);
  if (!Number.isFinite(n)) return undefined; // vino basura => ignorar/no tocar

  const int = Math.floor(n);
  if (int <= 0) return null;

  return int;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

    // ✅ Dinero: DB en centavos (Int)
    const priceCents = toMoneyCents(form.get("price"));
    const salePriceCentsIncoming = toMoneyCents(form.get("salePrice"));

    const categoryId = toStr(form.get("categoryId"));

    const stockIncoming = toNumber(form.get("stock"));
    const unitTypeIncoming = toUnitType(form.get("unitType"));

    // ✅ NUEVO: net content (pueden venir o no venir)
    const netWeightGrIncoming = toOptionalPositiveInt(form.get("netWeightGr"));
    const netVolumeMlIncoming = toOptionalPositiveInt(form.get("netVolumeMl"));

    // ✅ IVA opcional por producto
    const vatRateIncoming = toVatRate(form.get("vatRate"));

    const isOnSale = toBool(form.get("isOnSale"));
    const saleEndDateRaw = toStr(form.get("saleEndDate"));

    const isFeatured = toBool(form.get("isFeatured"));
    const isActive = toBool(form.get("isActive"));

    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        slug: true,
        unitType: true,
        netWeightGr: true,
        netVolumeMl: true,
      },
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
    const finalUnitType: UnitType =
      unitTypeIncoming ?? (existingProduct.unitType as UnitType);

    // ✅ imagen opcional
    const imageEntry = form.get("image");
    let imageUrlToSave: string | undefined;
    if (imageEntry instanceof File && imageEntry.size > 0) {
      const [uploaded] = await uploadImages([imageEntry]);
      imageUrlToSave = uploaded?.secureUrl;
    }

    // ✅ saleEndDate (vino o no vino) + VALIDACIÓN (datetime-local / ISO)
    let saleEndDateToSave: Date | null | undefined = undefined;
    if (saleEndDateRaw !== undefined) {
      if (!saleEndDateRaw) {
        saleEndDateToSave = null;
      } else {
        const d = new Date(saleEndDateRaw);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json(
            { error: "saleEndDate inválida" },
            { status: 400 }
          );
        }
        saleEndDateToSave = d;
      }
    }

    // ✅ stock según unidad
    let stockToSave: number | undefined = undefined;
    if (stockIncoming !== undefined) {
      stockToSave =
        finalUnitType === "PER_UNIT"
          ? Math.max(0, Math.floor(stockIncoming))
          : Math.max(0, stockIncoming); // PER_KG: permitir decimal
    }

    // ✅ Campos de oferta
    let salePriceToSave: number | null | undefined = undefined;
    let discountPercent: number | null | undefined = undefined;

    if (isOnSale === false) {
      // apagaron oferta => limpiamos
      salePriceToSave = null;
      discountPercent = null;
      saleEndDateToSave = null;
    } else {
      // si mandaron salePrice, lo seteamos (en centavos)
      if (salePriceCentsIncoming !== undefined) {
        salePriceToSave = salePriceCentsIncoming > 0 ? salePriceCentsIncoming : null;
      }

      // descuento (centavos contra centavos)
      if (
        isOnSale === true &&
        typeof priceCents === "number" &&
        typeof salePriceCentsIncoming === "number" &&
        priceCents > 0 &&
        salePriceCentsIncoming > 0 &&
        salePriceCentsIncoming < priceCents
      ) {
        discountPercent = Math.round(
          ((priceCents - salePriceCentsIncoming) / priceCents) * 100
        );
      }
    }

    // ✅ Contenido neto: decide si actualizar y cómo
    // - Si PER_KG => si vinieron campos, los limpiamos (null)
    // - Si PER_UNIT => aplicar lo que vino, pero validar no ambos
    let netWeightGrToSave: number | null | undefined = undefined;
    let netVolumeMlToSave: number | null | undefined = undefined;

    const netWeightCame = netWeightGrIncoming !== undefined;
    const netVolumeCame = netVolumeMlIncoming !== undefined;

    if (finalUnitType === "PER_KG") {
      // si cambió a PER_KG o ya era PER_KG y mandaron contenido, lo limpiamos
      if (netWeightCame || netVolumeCame || unitTypeIncoming === "PER_KG") {
        netWeightGrToSave = null;
        netVolumeMlToSave = null;
      }
    } else {
      // PER_UNIT
      const nextWeight =
        netWeightGrIncoming !== undefined ? netWeightGrIncoming : undefined;
      const nextVol =
        netVolumeMlIncoming !== undefined ? netVolumeMlIncoming : undefined;

      // Si el cliente mandó ambos y ambos terminan en número >0 => error
      const weightPositive =
        typeof nextWeight === "number" && nextWeight > 0;
      const volPositive =
        typeof nextVol === "number" && nextVol > 0;

      if (weightPositive && volPositive) {
        return NextResponse.json(
          { error: "Cargá solo uno: netWeightGr (gramos) o netVolumeMl (ml), no ambos." },
          { status: 400 }
        );
      }

      // Si vino netWeightGr, lo aplicamos y si es positivo limpiamos el otro
      if (netWeightGrIncoming !== undefined) {
        netWeightGrToSave = netWeightGrIncoming; // puede ser number o null
        if (typeof netWeightGrIncoming === "number" && netWeightGrIncoming > 0) {
          netVolumeMlToSave = null;
        }
      }

      // Si vino netVolumeMl, lo aplicamos y si es positivo limpiamos el otro
      if (netVolumeMlIncoming !== undefined) {
        netVolumeMlToSave = netVolumeMlIncoming; // puede ser number o null
        if (typeof netVolumeMlIncoming === "number" && netVolumeMlIncoming > 0) {
          netWeightGrToSave = null;
        }
      }
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),

        ...(priceCents !== undefined && { price: priceCents }),
        ...(categoryId !== undefined && { categoryId }),

        ...(imageUrlToSave !== undefined && { image: imageUrlToSave }),

        ...(stockToSave !== undefined && { stock: stockToSave }),

        // ✅ unitType solo si vino
        ...(unitTypeIncoming !== undefined && { unitType: finalUnitType as any }),

        // ✅ NUEVO: net content (si no vino, no tocar)
        ...(netWeightGrToSave !== undefined && { netWeightGr: netWeightGrToSave }),
        ...(netVolumeMlToSave !== undefined && { netVolumeMl: netVolumeMlToSave }),

        // ✅ IVA (si no vino el campo => no tocar)
        ...(vatRateIncoming !== undefined && { vatRate: vatRateIncoming }),

        ...(isOnSale !== undefined && { isOnSale }),

        ...(salePriceToSave !== undefined && { salePrice: salePriceToSave }),
        ...(saleEndDateToSave !== undefined && { saleEndDate: saleEndDateToSave }),
        ...(discountPercent !== undefined && { discountPercent }),

        ...(isFeatured !== undefined && { isFeatured }),
        ...(isActive !== undefined && { isActive }),
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

        // ✅ NUEVO
        netWeightGr: true,
        netVolumeMl: true,

        vatRate: true,

        isOnSale: true,
        salePrice: true,
        saleEndDate: true,
        discountPercent: true,
        isFeatured: true,
        isActive: true,

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

    const id = params.id;

    // Si tiene ventas asociadas, NO borramos hard (rompe historial). Desactivamos.
    const usedCount = await prisma.orderItem.count({
      where: { productId: id },
    });

    if (usedCount > 0) {
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        ok: true,
        mode: "soft",
        message: "Producto desactivado (tiene pedidos asociados).",
      });
    }

    // Si no está referenciado, sí borramos
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      mode: "hard",
      message: "Producto eliminado.",
    });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: error?.message ?? "Error al eliminar producto" },
      { status: 500 }
    );
  }
}