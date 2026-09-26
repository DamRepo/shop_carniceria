import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { verifyMpPaymentForOrder } from "@/lib/mp-payment-processor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({ csId: z.string().min(1).max(64) });

// Versión pública acotada: el cliente solo conoce su csId (viene en la back_url
// de MP). Devuelve únicamente el paymentStatus de SU orden; sin ids ni montos.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { success } = rateLimit(`mp-verify:${ip}`, 10, 10 * 60 * 1000);
  if (!success) {
    return NextResponse.json({ error: "Demasiados intentos, esperá unos minutos" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: "Error de configuración" }, { status: 500 });
  }

  const cs = await prisma.checkoutSession.findUnique({
    where: { id: parsed.data.csId },
    select: { orderId: true },
  });
  if (!cs?.orderId) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  try {
    await verifyMpPaymentForOrder(cs.orderId, accessToken);
  } catch (e) {
    console.error("POST mp verify error:", e);
  }

  const order = await prisma.order.findUnique({
    where: { id: cs.orderId },
    select: { paymentStatus: true },
  });

  return NextResponse.json({ paymentStatus: order?.paymentStatus ?? null });
}
