import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 });
    }

    const body = (await request.json()) as {
      name?: string;
      username?: string | null;
      phone?: string | null;
    };

    const updateData: { name?: string; username?: string | null; phone?: string | null } = {};

    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (name.length < 2 || name.length > 50) {
        return NextResponse.json(
          { error: "El nombre debe tener entre 2 y 50 caracteres" },
          { status: 400 }
        );
      }
      updateData.name = name;
    }

    if (body.username !== undefined) {
      const u = typeof body.username === "string" ? body.username.trim() : "";
      if (u === "") {
        updateData.username = null;
      } else {
        if (u.length < 3 || u.length > 20) {
          return NextResponse.json(
            { error: "El nombre de usuario debe tener entre 3 y 20 caracteres" },
            { status: 400 }
          );
        }
        if (!/^[a-zA-Z0-9_]+$/.test(u)) {
          return NextResponse.json(
            { error: "Solo se permiten letras, números y guiones bajos" },
            { status: 400 }
          );
        }
        const existing = await prisma.user.findFirst({
          where: { username: u, NOT: { id: userId } },
          select: { id: true },
        });
        if (existing) {
          return NextResponse.json(
            { error: "Ese nombre de usuario ya está en uso" },
            { status: 409 }
          );
        }
        updateData.username = u;
      }
    }

    if (body.phone !== undefined) {
      updateData.phone =
        typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No hay datos para actualizar" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, username: true, phone: true, email: true, image: true },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Error al actualizar el perfil" }, { status: 500 });
  }
}
