import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function requireAdmin(session: any) {
  return session && session.user?.role === "ADMIN";
}

export async function GET() {
  // listar categorías: esto normalmente puede ser público
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { products: true } },
    },
  });

  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const name = String(body?.name ?? "").trim();
  const description =
    body?.description == null ? null : String(body.description).trim() || null;

  if (!name) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }

  const baseSlug = slugify(name);
  let slug = baseSlug;

  // si existe por slug, devolverla (idempotente)
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) return NextResponse.json(existing);

  // fallback por colisiones
  for (let i = 0; i < 50; i++) {
    const exists = await prisma.category.findUnique({ where: { slug } });
    if (!exists) break;
    slug = `${baseSlug}-${i + 2}`;
  }

  const created = await prisma.category.create({
    data: { name, slug, description },
  });

  return NextResponse.json(created, { status: 201 });
}
