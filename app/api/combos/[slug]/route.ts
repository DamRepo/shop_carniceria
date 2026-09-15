import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeComboPricing, sumComboComponentsCents } from "@/lib/combos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const combo = await prisma.combo.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        stock: true,
        isActive: true,
        priceType: true,
        priceValue: true,
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
      },
    });

    if (!combo || !combo.isActive) {
      return NextResponse.json({ error: "Combo no encontrado" }, { status: 404 });
    }

    const componentsTotalCents = sumComboComponentsCents(combo.items);
    const { finalPriceCents, savingsCents } = computeComboPricing({
      priceType: combo.priceType,
      priceValue: combo.priceValue,
      componentsTotalCents,
    });

    return NextResponse.json({
      id: combo.id,
      name: combo.name,
      slug: combo.slug,
      description: combo.description,
      imageUrl: combo.imageUrl,
      stock: combo.stock,
      finalPriceCents,
      savingsCents,
      items: combo.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        product: item.product,
      })),
    });
  } catch (error) {
    console.error("Error fetching combo:", error);
    return NextResponse.json({ error: "Error al obtener el combo" }, { status: 500 });
  }
}
