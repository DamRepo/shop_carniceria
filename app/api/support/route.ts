import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { rateLimit } from "@/lib/rate-limit";

const resend = new Resend(process.env.RESEND_API_KEY);

function getClientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const real = req.headers.get("x-real-ip");
  if (real) return real;

  return "unknown";
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {

    const ip = getClientIp(req);

    const rl = rateLimit(`support:${ip}`, 5, 15 * 60 * 1000);

    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiados intentos. Probá más tarde." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);

    const name =
      typeof body?.name === "string" ? body.name.trim() : "";

    const email =
      typeof body?.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const message =
      typeof body?.message === "string"
        ? body.message.trim()
        : "";

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Faltan datos" },
        { status: 400 }
      );
    }

    if (!validEmail(email)) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Mensaje demasiado largo" },
        { status: 400 }
      );
    }

    await resend.emails.send({
      from: process.env.MAIL_FROM!,
      to: process.env.SUPPORT_EMAIL!,
      replyTo: email,
      subject: "Nuevo mensaje de soporte",
      text: `
Nombre: ${name}
Email: ${email}

Mensaje:
${message}
      `,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Error enviando mensaje" },
      { status: 500 }
    );
  }
}