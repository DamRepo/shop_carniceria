import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const revalidate = 3600; // 1 hora — categorías raramente cambian

export async function GET() {
  try {
    const parents = await prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        children: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
          },
        },
      },
    });

    return NextResponse.json(parents ?? []);
  } catch (e) {
    return NextResponse.json({ error: "Error al obtener categorías" }, { status: 500 });
  }
}
