import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const { success } = rateLimit(`search:${ip}`, 30, 60 * 1000);
  if (!success) {
    return NextResponse.json(
      { error: "Demasiadas búsquedas. Esperá un momento." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const q = String(searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const items = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      image: true, // en tu schema es `image` (string?)
    },
    take: 6,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(items);
}

