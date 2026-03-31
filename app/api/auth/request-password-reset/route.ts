import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateResetToken } from "@/lib/auth/resetToken";
import { sendResetPasswordEmail } from "@/lib/mail/actions";
import { rateLimit } from "@/lib/rate-limit";

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export async function POST(req: NextRequest) {
  const okResponse = NextResponse.json({ ok: true });

  try {
    const ip = getClientIp(req);
    const rl = rateLimit(`reset-password:${ip}`, 5, 15 * 60 * 1000);

    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiados intentos. Probá más tarde." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) return okResponse;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Equalizar timing entre email existente y no existente para evitar enumeración
      await new Promise((r) => setTimeout(r, 80 + Math.random() * 80));
      return okResponse;
    }

    const { token, tokenHash } = generateResetToken();

    const ttlMin = Number(process.env.RESET_TOKEN_TTL_MIN ?? "30");
    const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);

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
    console.error("Error request-password-reset:", err);
    return okResponse;
  }
}