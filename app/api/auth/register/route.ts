import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/mail/actions";
import { normalizeEmail, normalizeOptionalString } from "@/lib/normalize";
import { rateLimit } from "@/lib/rate-limit";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() ?? "unknown";
}

export async function POST(request: NextRequest) {
  try {
    // Límite: 10 registros por IP cada 60 minutos para frenar spam y enumeración
    const ip = getClientIp(request);
    const rl = rateLimit(`register:${ip}`, 10, 60 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiados intentos. Probá más tarde." },
        { status: 429 }
      );
    }

    const body = await request.json();

    const email = normalizeEmail(body?.email);
    const rawPassword =
      typeof body?.password === "string" ? body.password : "";
    const password = rawPassword.trim();
    const name =
      typeof body?.name === "string" ? body.name.trim() : "";
    const phone = normalizeOptionalString(body?.phone);
    const receiveOffers = Boolean(body?.receiveOffers);

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    if (password.length > 100) {
      return NextResponse.json(
        { error: "La contraseña es demasiado larga" },
        { status: 400 }
      );
    }

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { error: "El nombre debe tener entre 2 y 80 caracteres" },
        { status: 400 }
      );
    }

    if (phone) {
      // Solo dígitos, espacios, +, -, (). Mínimo 7 y máximo 20 caracteres
      if (!/^[+\d\s\-().]{7,20}$/.test(phone)) {
        return NextResponse.json(
          { error: "Teléfono inválido (solo dígitos, +, -, espacios, paréntesis)" },
          { status: 400 }
        );
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "No se pudo completar el registro. Intentá iniciar sesión o usar otro email." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        receiveOffers,
        role: "CUSTOMER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    try {
      await sendWelcomeEmail({
        to: user.email,
        name: user.name ?? undefined,
      });
    } catch (err) {
      console.error("Error enviando email de bienvenida:", err);
    }

    return NextResponse.json(
      { message: "Usuario creado exitosamente", user },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en registro:", error);
    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 }
    );
  }
}