import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  getPointsBalance,
  getPointsHistory,
  isPointsEnabled,
  pointsToCents,
} from "@/lib/loyalty-points";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function respond(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Saldo de puntos del cliente logueado, para el perfil y el header. Con el
 * flag apagado responde 404, igual que si la ruta no existiera.
 */
export async function GET(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const { success } = rateLimit(`loyalty-points:${ip}`, 60, 10 * 60 * 1000);
  if (!success) return respond({ error: "Demasiadas solicitudes" }, 429);

  if (!isPointsEnabled()) return respond({ error: "No disponible" }, 404);

  const session = await getServerSession(authOptions).catch(() => null);
  const user: unknown = session?.user;
  const userId =
    typeof user === "object" && user !== null && "id" in user && typeof user.id === "string"
      ? user.id
      : null;
  const role =
    typeof user === "object" && user !== null && "role" in user && typeof user.role === "string"
      ? user.role
      : null;
  if (!userId) return respond({ error: "Iniciá sesión para ver tus puntos" }, 401);
  if (role !== "CUSTOMER") return respond({ error: "Esta cuenta no tiene puntos" }, 403);

  try {
    const [balance, history] = await Promise.all([
      getPointsBalance(userId),
      getPointsHistory(userId, 20),
    ]);
    return respond({
      balance: balance.available,
      balanceCents: pointsToCents(balance.available),
      nextExpiry: balance.nextExpiry
        ? { points: balance.nextExpiry.points, expiresAt: balance.nextExpiry.expiresAt.toISOString() }
        : null,
      history: history.map((h) => ({
        kind: h.kind,
        points: h.points,
        date: h.date.toISOString(),
        orderNumber: h.orderNumber,
      })),
    });
  } catch (e) {
    console.error("GET /api/loyalty/points error:", e);
    return respond({ error: "No se pudo cargar el saldo de puntos" }, 500);
  }
}
