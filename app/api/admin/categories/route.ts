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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();

  const name = String(body?.name ?? "").trim();
  const description =
    body?.description !== undefined && body?.description !== null
      ? String(body.description).trim()
      : null;
  const parentId =
    body?.parentId && typeof body.parentId === "string" ? body.parentId : null;

  if (!name) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }

  // Verificar que el parentId existe si fue provisto
  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    if (!parent) {
      return NextResponse.json({ error: "Categoría madre no encontrada" }, { status: 400 });
    }
  }

  // slug opcional: si no viene, lo generamos
  const providedSlug = String(body?.slug ?? "").trim();
  const baseSlug = slugify(providedSlug || name);

  if (!baseSlug) {
    return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
  }

  let slug = baseSlug;

  // evitar colisiones (una sola query)
  const existing = await prisma.category.findMany({
    where: { slug: { startsWith: baseSlug } },
    select: { slug: true },
  });
  const taken = new Set(existing.map((c) => c.slug));

  if (taken.has(slug)) {
    for (let i = 2; i < 52; i++) {
      slug = `${baseSlug}-${i}`;
      if (!taken.has(slug)) break;
    }
  }

  const created = await prisma.category.create({
    data: { name, slug, description, parentId },
  });

  return NextResponse.json(created, { status: 201 });
}

