import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getWelcomeEligibility, isLoyaltyEnabled } from "@/lib/loyalty";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BannerVariant = "guest" | "eligible" | null;

function respond(variant: BannerVariant, status = 200) {
  return NextResponse.json(
    { variant },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * Qué versión del banner de bienvenida mostrar en el home. Responde solo la
 * variante: con el flag apagado devuelve null igual que un no elegible, así
 * el valor del flag nunca llega al cliente.
 */
export async function GET(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const { success } = rateLimit(`welcome-banner:${ip}`, 30, 10 * 60 * 1000);
  if (!success) return respond(null, 429);

  if (!isLoyaltyEnabled()) return respond(null);

  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const user: unknown = session?.user;
    const userId =
      typeof user === "object" && user !== null && "id" in user && typeof user.id === "string"
        ? user.id
        : null;

    if (!userId) return respond("guest");

    const eligibility = await getWelcomeEligibility(userId);
    return respond(eligibility.eligible ? "eligible" : null);
  } catch (e) {
    console.error("GET /api/loyalty/welcome-banner error:", e);
    return respond(null);
  }
}
