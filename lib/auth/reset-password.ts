import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // ajustá a tu prisma client real
import bcrypt from "bcryptjs";
import { hashResetToken } from "./resetToken"; 

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!token || password.length < 6) {
      return NextResponse.json(
        { error: "Token inválido o contraseña muy corta" },
        { status: 400 }
      );
    }

    const tokenHash = hashResetToken(token);

    const record = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Token inválido o expirado" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: passwordHash },
       
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // opcional: invalidar otros tokens del mismo usuario
      prisma.passwordResetToken.updateMany({
        where: {
          userId: record.userId,
          usedAt: null,
          id: { not: record.id },
        },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error reset-password:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
