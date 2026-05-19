import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

async function notifyTelegram(mensaje: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: mensaje }),
  });
}

const feedbackSchema = z.object({
  estrellas: z.number().int().min(1).max(5).optional(),
  encontro: z.boolean().optional(),
  compraria: z.enum(["Si", "Tal vez", "No"]).optional(),
  comentario: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido" },
      { status: 400 }
    );
  }

  const parsed = feedbackSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    await prisma.feedback.create({
      data: {
        estrellas: parsed.data.estrellas ?? null,
        encontro: parsed.data.encontro ?? null,
        compraria: parsed.data.compraria ?? null,
        comentario: parsed.data.comentario ?? null,
      },
    });

    const { estrellas, encontro, compraria, comentario } = parsed.data;
    const fecha = new Date().toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
    });
    const mensaje = [
      "🗣️ Nueva opinión - Carnicería El Negro",
      "",
      `⭐ Calificación: ${estrellas != null ? `${estrellas}/5` : "No indicada"}`,
      `🔍 ¿Encontró lo que buscaba?: ${encontro != null ? (encontro ? "Sí" : "No") : "No indicado"}`,
      `🛒 ¿Compraría online?: ${compraria ?? "No indicado"}`,
      `💬 Comentario: ${comentario || "Sin comentario"}`,
      `📅 ${fecha}`,
    ].join("\n");

    await notifyTelegram(mensaje);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/feedback]", error);
    return NextResponse.json(
      { ok: false, error: "Error interno al guardar feedback" },
      { status: 500 }
    );
  }
}
