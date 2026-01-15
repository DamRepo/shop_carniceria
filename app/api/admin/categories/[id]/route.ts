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

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const id = params.id;
  const body = await req.json();

  const name = body?.name == null ? undefined : String(body.name).trim();
  const description =
    body?.description == null ? undefined : String(body.description).trim() || null;

  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  let slug = current.slug;

  // si cambia el nombre, regenerar slug evitando colisiones
  if (typeof name === "string" && name && name !== current.name) {
    const baseSlug = slugify(name);
    slug = baseSlug;

    for (let i = 0; i < 50; i++) {
      const conflict = await prisma.category.findFirst({
        where: { slug, NOT: { id } },
        select: { id: true },
      });
      if (!conflict) break;
      slug = `${baseSlug}-${i + 2}`;
    }
  }

  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(typeof name === "string" && name ? { name, slug } : {}),
      ...(description !== undefined ? { description } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const id = params.id;

  const cat = await prisma.category.findUnique({
    where: { id },
    select: { id: true, _count: { select: { products: true } } },
  });

  if (!cat) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  // seguridad: no borrar si hay productos asociados
  if (cat._count.products > 0) {
    return NextResponse.json(
      { error: "No se puede borrar: hay productos asociados" },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}