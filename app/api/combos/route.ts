import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeComboPricing, sumComboComponentsCents } from "@/lib/combos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const combos = await prisma.combo.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        stock: true,
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

    const result = combos.map((combo) => {
      const componentsTotalCents = sumComboComponentsCents(combo.items);
      const { finalPriceCents, savingsCents } = computeComboPricing({
        priceType: combo.priceType,
        priceValue: combo.priceValue,
        componentsTotalCents,
      });

      return {
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
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching combos:", error);
    return NextResponse.json({ error: "Error al obtener combos" }, { status: 500 });
  }
}
