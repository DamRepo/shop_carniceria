import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // ajustá si tu prisma client está en otro path
import { generateResetToken } from "@/lib/auth/resetToken";
import { sendResetPasswordEmail } from "@/lib/mail/actions";

export async function POST(req: Request) {
  // Respuesta genérica SIEMPRE (no revelar si existe el email)
  const okResponse = NextResponse.json({ ok: true });

  try {
    const body = await req.json().catch(() => null);
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) return okResponse;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return okResponse;

    const { token, tokenHash } = generateResetToken();

    const ttlMin = Number(process.env.RESET_TOKEN_TTL_MIN ?? "30");
    const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);

    // ✅ Invalidar tokens anteriores activos de ese usuario (opcional pero recomendado)
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const resetUrl = `${appUrl}/auth/reset-password?token=${encodeURIComponent(
      token
    )}`;

    await sendResetPasswordEmail({
      to: user.email,
      name: user.name ?? undefined,
      resetUrl,
    });

    return okResponse;
  } catch (err) {
    // Importante: aunque haya error interno, seguí devolviendo genérico para no filtrar info
    console.error("Error request-password-reset:", err);
    return okResponse;
  }
}
