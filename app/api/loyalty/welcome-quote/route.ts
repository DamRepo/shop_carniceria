import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { computeWelcomeQuote } from "@/lib/loyalty";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Tope de cordura para el subtotal que manda el cliente ($10.000.000).
const MAX_SUBTOTAL_CENTS = 1_000_000_000;

/**
 * Cotización de la bienvenida SOLO para mostrarla en el checkout. El subtotal
 * viene del carrito del cliente y no se usa para cobrar: el monto real lo
 * recalcula el checkout con los precios de la base al crear el pago.
 */
export async function GET(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const { success } = rateLimit(`welcome-quote:${ip}`, 30, 10 * 60 * 1000);
  if (!success) {
    return NextResponse.json({ eligible: false, discountCents: 0 }, { status: 429 });
  }

  // IMPORTANTE: este subtotal lo manda el cliente y es SOLO PARA MOSTRAR el
  // descuento en el checkout. Nunca se usa para cobrar: al crear el pago,
  // app/api/checkout/talo/route.ts recalcula subtotal y descuento en el servidor
  // con los precios de la base, y responde 409 si la bienvenida ya no aplica.
  const subtotalCents = Number(new URL(req.url).searchParams.get("subtotal"));
  if (!Number.isInteger(subtotalCents) || subtotalCents < 0 || subtotalCents > MAX_SUBTOTAL_CENTS) {
    return NextResponse.json({ error: "Subtotal inválido" }, { status: 400 });
  }

  const session = await getServerSession(authOptions).catch(() => null);
  const user: unknown = session?.user;
  const userId =
    typeof user === "object" && user !== null && "id" in user && typeof user.id === "string"
      ? user.id
      : null;

  const quote = await computeWelcomeQuote({ userId, subtotalCents });
  return NextResponse.json({ eligible: quote.eligible, discountCents: quote.discountCents });
}
