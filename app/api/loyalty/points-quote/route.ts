import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { computeCartSubtotalCents } from "@/lib/cart-subtotal";
import { computeWelcomeQuote } from "@/lib/loyalty";
import { computeCheckoutPointsPreview, isPointsEnabled } from "@/lib/loyalty-points";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAYMENT_METHODS = ["CASH", "TALO_PAY", "MERCADO_PAGO"] as const;

function respond(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Cotización de puntos para la tarjeta del checkout. Recibe el medio de pago
 * y el carrito; el subtotal, la bienvenida y el canje los recalcula el
 * servidor con los precios de la base. SOLO PARA MOSTRAR: al confirmar, el
 * checkout vuelve a calcular todo y exige que coincida (expectedPoints).
 * Con el flag apagado responde 404.
 */
export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const { success } = rateLimit(`loyalty-points-quote:${ip}`, 60, 10 * 60 * 1000);
  if (!success) return respond({ error: "Demasiadas solicitudes" }, 429);

  if (!isPointsEnabled()) return respond({ error: "No disponible" }, 404);

  const body: unknown = await req.json().catch(() => null);
  if (typeof body !== "object" || body === null) return respond({ error: "Pedido inválido" }, 400);

  const paymentMethod = "paymentMethod" in body ? body.paymentMethod : null;
  if (typeof paymentMethod !== "string" || !(PAYMENT_METHODS as readonly string[]).includes(paymentMethod)) {
    return respond({ error: "Medio de pago inválido" }, 400);
  }

  const subtotalCents = await computeCartSubtotalCents("items" in body ? body.items : null);
  if (subtotalCents === null) return respond({ error: "Carrito inválido" }, 400);

  const session = await getServerSession(authOptions).catch(() => null);
  const user: unknown = session?.user;
  const userId =
    typeof user === "object" && user !== null && "id" in user && typeof user.id === "string"
      ? user.id
      : null;

  try {
    // La bienvenida, si está disponible, se aplica con efectivo y Talo (igual
    // que en el checkout). En ese caso no se pueden usar puntos.
    let welcomeDiscountCents = 0;
    if (paymentMethod !== "MERCADO_PAGO") {
      const welcome = await computeWelcomeQuote({ userId, subtotalCents });
      if (welcome.eligible) welcomeDiscountCents = welcome.discountCents;
    }

    const preview = await computeCheckoutPointsPreview({
      userId,
      subtotalCents,
      welcomeDiscountCents,
      paymentMethod,
    });
    return respond({ subtotalCents, welcomeDiscountCents, ...preview });
  } catch (e) {
    console.error("POST /api/loyalty/points-quote error:", e);
    return respond({ error: "No se pudo cotizar los puntos" }, 500);
  }
}
