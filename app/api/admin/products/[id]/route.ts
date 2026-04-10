import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadImages } from "@/lib/uploads/upload-images";

type UnitType = "PER_KG" | "PER_UNIT";

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

  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function toNullableFloat(v: FormDataEntryValue | null): number | null | undefined {
  if (v === null) return undefined;
  const s = String(v).trim();
  if (!s) return null;

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

/** Dinero ARS -> CENTAVOS (Int) */
function toMoneyCents(v: FormDataEntryValue | null): number | undefined {
  const s0 = String(v ?? "").trim();
  if (!s0) return undefined;

  const s = s0.includes(",") ? s0.replace(/\./g, "").replace(",", ".") : s0;
  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;

  return Math.round(n * 100);
}

/**
 * IVA opcional por producto:
 * - si no vino el campo => undefined (no tocar)
 * - si vino vacío => null (usar categoría)
 * - si vino "0.21" => 0.21
 * - si vino "0.105" => 0.105
 */
function toVatRate(v: FormDataEntryValue | null): number | null | undefined {
  if (v === null) return undefined;
  const s = String(v).trim();
  if (!s) return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;

  if (n === 0.21 || n === 0.105) return n;

  return undefined;
}

/**
 * Entero positivo opcional (gramos/ml)
 * - si no vino => undefined (no tocar)
 * - si vino vacío => null (limpiar)
 * - si vino <=0 => null
 * - si vino decimal => floor
 */
function toOptionalPositiveInt(
  v: FormDataEntryValue | null
): number | null | undefined {
  if (v === null) return undefined;

  const s = String(v).trim();
  if (!s) return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;

  const int = Math.floor(n);
  if (int <= 0) return null;

  return int;
}

/* =========================
   Helpers de stock
   Modelo consistente:
   - PER_UNIT => stock en unidades enteras
   - PER_KG   => stock en gramos enteros en DB
   ========================= */
function stockToDb(stockRaw: number, unitType: UnitType): number {
  if (!Number.isFinite(stockRaw) || stockRaw < 0) return 0;

  if (unitType === "PER_UNIT") {
    return Math.max(0, Math.floor(stockRaw));
  }

  // El admin carga kg; en DB guardamos gramos enteros
  return Math.max(0, Math.round(stockRaw * 1000));
}

function stockFromDb(stockRaw: number, unitType: UnitType): number {
  if (!Number.isFinite(stockRaw) || stockRaw < 0) return 0;

  if (unitType === "PER_UNIT") {
    return stockRaw;
  }

  // En DB está en gramos; al admin le devolvemos kg
  return stockRaw / 1000;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { error: "Se requiere { isActive: boolean }" },
        { status: 400 }
      );
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: { isActive: body.isActive },
      select: { id: true, isActive: true },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error toggling product isActive:", error);
    return NextResponse.json(
      { error: "Error al actualizar producto" },
      { status: 500 }
    );
  }
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

    const priceCents = toMoneyCents(form.get("price"));
    const salePriceCentsIncoming = toMoneyCents(form.get("salePrice"));

    const categoryId = toStr(form.get("categoryId"));

    const stockIncoming = toNumber(form.get("stock"));
    const unitTypeIncoming = toUnitType(form.get("unitType"));

    const netWeightGrIncoming = toOptionalPositiveInt(form.get("netWeightGr"));
    const netVolumeMlIncoming = toOptionalPositiveInt(form.get("netVolumeMl"));

    const vatRateIncoming = toVatRate(form.get("vatRate"));

    const isOnSale = toBool(form.get("isOnSale"));
    const saleEndDateRaw = toStr(form.get("saleEndDate"));

    const isFeatured = toBool(form.get("isFeatured"));
    const isActive = toBool(form.get("isActive"));

    const minPurchaseQtyIncoming = toNullableFloat(form.get("minPurchaseQty"));
    const qtyStepIncoming = toNullableFloat(form.get("qtyStep"));
    const maxPurchaseQtyIncoming = toNullableFloat(form.get("maxPurchaseQty"));
    const allowsDecimalsIncoming = toBool(form.get("allowsDecimals"));

    const measurementUnitIncoming = toStr(form.get("measurementUnit"));
    const unitMultiplierRaw = toNumber(form.get("unitMultiplier"));
    const unitMultiplierIncoming =
      unitMultiplierRaw !== undefined
        ? Number.isFinite(unitMultiplierRaw) && unitMultiplierRaw > 0
          ? unitMultiplierRaw
          : 1
        : undefined;

    const brandRaw = form.get("brand");
    const brandIncoming: string | null | undefined =
      brandRaw === null ? undefined : (String(brandRaw).trim() || null);

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

    const finalUnitType: UnitType =
      unitTypeIncoming ?? (existingProduct.unitType as UnitType);

    const imageEntry = form.get("image");
    let imageUrlToSave: string | undefined;
    if (imageEntry instanceof File && imageEntry.size > 0) {
      const [uploaded] = await uploadImages([imageEntry]);
      imageUrlToSave = uploaded?.secureUrl;
    }

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

    let stockToSave: number | undefined = undefined;
    if (stockIncoming !== undefined) {
      // PER_KG: el admin ingresa kg; en DB se guarda en gramos (×1000).
      // Límite: 999 999 kg = ~999 999 000 gramos, dentro del rango Int32 (max ~2 147 483 647).
      const maxStock = finalUnitType === "PER_KG" ? 999_999 : 2_000_000;
      if (!Number.isFinite(stockIncoming) || stockIncoming < 0 || stockIncoming > maxStock) {
        return NextResponse.json(
          { error: `Stock inválido (máximo ${maxStock} ${finalUnitType === "PER_KG" ? "kg" : "unidades"})` },
          { status: 400 }
        );
      }

      stockToSave = stockToDb(stockIncoming, finalUnitType);
    }

    let salePriceToSave: number | null | undefined = undefined;
    let discountPercent: number | null | undefined = undefined;

    if (isOnSale === false) {
      salePriceToSave = null;
      discountPercent = null;
      saleEndDateToSave = null;
    } else {
      if (salePriceCentsIncoming !== undefined) {
        salePriceToSave = salePriceCentsIncoming > 0 ? salePriceCentsIncoming : null;
      }

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

    let netWeightGrToSave: number | null | undefined = undefined;
    let netVolumeMlToSave: number | null | undefined = undefined;

    const netWeightCame = netWeightGrIncoming !== undefined;
    const netVolumeCame = netVolumeMlIncoming !== undefined;

    if (finalUnitType === "PER_KG") {
      if (netWeightCame || netVolumeCame || unitTypeIncoming === "PER_KG") {
        netWeightGrToSave = null;
        netVolumeMlToSave = null;
      }
    } else {
      const nextWeight =
        netWeightGrIncoming !== undefined ? netWeightGrIncoming : undefined;
      const nextVol =
        netVolumeMlIncoming !== undefined ? netVolumeMlIncoming : undefined;

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

      if (netWeightGrIncoming !== undefined) {
        netWeightGrToSave = netWeightGrIncoming;
        if (typeof netWeightGrIncoming === "number" && netWeightGrIncoming > 0) {
          netVolumeMlToSave = null;
        }
      }

      if (netVolumeMlIncoming !== undefined) {
        netVolumeMlToSave = netVolumeMlIncoming;
        if (typeof netVolumeMlIncoming === "number" && netVolumeMlIncoming > 0) {
          netWeightGrToSave = null;
        }
      }
    }

    let minPurchaseQtyToSave: number | null | undefined = undefined;
    let qtyStepToSave: number | null | undefined = undefined;
    let maxPurchaseQtyToSave: number | null | undefined = undefined;
    let allowsDecimalsToSave: boolean | undefined = undefined;

    if (minPurchaseQtyIncoming !== undefined) {
      if (minPurchaseQtyIncoming !== null && minPurchaseQtyIncoming <= 0) {
        return NextResponse.json(
          { error: "minPurchaseQty debe ser mayor a 0" },
          { status: 400 }
        );
      }
      minPurchaseQtyToSave = minPurchaseQtyIncoming;
    }

    if (qtyStepIncoming !== undefined) {
      if (qtyStepIncoming !== null && qtyStepIncoming <= 0) {
        return NextResponse.json(
          { error: "qtyStep debe ser mayor a 0" },
          { status: 400 }
        );
      }
      qtyStepToSave = qtyStepIncoming;
    }

    if (maxPurchaseQtyIncoming !== undefined) {
      if (maxPurchaseQtyIncoming !== null && maxPurchaseQtyIncoming <= 0) {
        return NextResponse.json(
          { error: "maxPurchaseQty debe ser mayor a 0" },
          { status: 400 }
        );
      }
      maxPurchaseQtyToSave = maxPurchaseQtyIncoming;
    }

    if (allowsDecimalsIncoming !== undefined) {
      allowsDecimalsToSave = allowsDecimalsIncoming;
    }

    const effectiveMin =
      minPurchaseQtyToSave !== undefined ? minPurchaseQtyToSave : undefined;
    const effectiveStep =
      qtyStepToSave !== undefined ? qtyStepToSave : undefined;
    const effectiveMax =
      maxPurchaseQtyToSave !== undefined ? maxPurchaseQtyToSave : undefined;

    if (
      effectiveMin !== undefined &&
      effectiveStep !== undefined &&
      effectiveMin !== null &&
      effectiveStep !== null &&
      effectiveStep > effectiveMin
    ) {
      return NextResponse.json(
        { error: "qtyStep no puede ser mayor que minPurchaseQty" },
        { status: 400 }
      );
    }

    if (
      effectiveMin !== undefined &&
      effectiveMax !== undefined &&
      effectiveMin !== null &&
      effectiveMax !== null &&
      effectiveMax < effectiveMin
    ) {
      return NextResponse.json(
        { error: "maxPurchaseQty no puede ser menor que minPurchaseQty" },
        { status: 400 }
      );
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

        ...(unitTypeIncoming !== undefined && { unitType: finalUnitType }),

        ...(netWeightGrToSave !== undefined && { netWeightGr: netWeightGrToSave }),
        ...(netVolumeMlToSave !== undefined && { netVolumeMl: netVolumeMlToSave }),

        ...(vatRateIncoming !== undefined && { vatRate: vatRateIncoming }),

        ...(isOnSale !== undefined && { isOnSale }),

        ...(salePriceToSave !== undefined && { salePrice: salePriceToSave }),
        ...(saleEndDateToSave !== undefined && { saleEndDate: saleEndDateToSave }),
        ...(discountPercent !== undefined && { discountPercent }),

        ...(minPurchaseQtyToSave !== undefined && { minPurchaseQty: minPurchaseQtyToSave }),
        ...(qtyStepToSave !== undefined && { qtyStep: qtyStepToSave }),
        ...(maxPurchaseQtyToSave !== undefined && { maxPurchaseQty: maxPurchaseQtyToSave }),
        ...(allowsDecimalsToSave !== undefined && { allowsDecimals: allowsDecimalsToSave }),

        ...(isFeatured !== undefined && { isFeatured }),
        ...(isActive !== undefined && { isActive }),

        ...(measurementUnitIncoming !== undefined && { measurementUnit: measurementUnitIncoming }),
        ...(unitMultiplierIncoming !== undefined && { unitMultiplier: unitMultiplierIncoming }),
        ...(brandIncoming !== undefined && { brand: brandIncoming }),
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

        minPurchaseQty: true,
        qtyStep: true,
        maxPurchaseQty: true,
        allowsDecimals: true,

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
            parentId: true,
            vatRate: true,
          },
        },
      },
    });

    const normalizedProduct = {
      ...product,
      stock: stockFromDb(product.stock, product.unitType as UnitType),
    };

    return NextResponse.json(normalizedProduct);
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

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      mode: "hard",
      message: "Producto eliminado.",
    });
  } catch (error: unknown) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Error al eliminar producto" },
      { status: 500 }
    );
  }
}