import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getOrderPointsInfo, isPointsEnabled } from "@/lib/loyalty-points";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Estado público de una sesión de checkout de Talo Pay, consultado por csId
 * (cuid no adivinable) mientras el cliente espera la confirmación del pago.
 * No expone datos personales del cliente.
 */
export async function GET(_req: Request, { params }: { params: { csId: string } }) {
  const cs = await prisma.checkoutSession.findUnique({
    where: { id: params.csId },
    select: {
      status: true,
      taloStatus: true,
      taloCvu: true,
      taloAlias: true,
      taloExpiresAt: true,
      total: true,
      welcomeDiscount: true,
      pointsDiscount: true,
      pointsRedeemed: true,
      orderId: true,
      order: { select: { orderNumber: true, status: true } },
    },
  });

  if (!cs) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  // Puntos a ganar / ganados: solo con el flag prendido y solo para el dueño
  // del pedido (sesión). Quien tenga el csId sin ser el dueño no los ve.
  let pointsInfo: { toEarn: number; earned: number } | null = null;
  if (isPointsEnabled()) {
    try {
      const session = await getServerSession(authOptions).catch(() => null);
      const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
      pointsInfo = await getOrderPointsInfo(cs.orderId, userId);
    } catch (e) {
      console.error("talo status: error cargando puntos", e);
    }
  }

  return NextResponse.json({
    status: cs.status,
    taloStatus: cs.taloStatus,
    cvu: cs.taloCvu,
    alias: cs.taloAlias,
    expiresAt: cs.taloExpiresAt,
    total: cs.total, // centavos (igual que el resto de la app) — el cliente lo formatea con formatPrice()
    welcomeDiscount: cs.welcomeDiscount ?? 0, // centavos; 0 = sin descuento
    orderId: cs.orderId,
    orderNumber: cs.order?.orderNumber ?? null,
    // Estado de la ORDEN (no de la sesión): el admin puede cancelarla sin que
    // la CheckoutSession cambie, y el cliente que está esperando tiene que enterarse.
    orderStatus: cs.order?.status ?? null,
    // Puntos: solo si hubo canje / hay puntos (sin puntos la respuesta queda igual).
    ...(cs.pointsDiscount
      ? { pointsDiscount: cs.pointsDiscount, pointsRedeemed: cs.pointsRedeemed ?? 0 }
      : {}),
    ...(pointsInfo && pointsInfo.toEarn > 0 ? { pointsToEarn: pointsInfo.toEarn } : {}),
    ...(pointsInfo && pointsInfo.earned > 0 ? { pointsEarned: pointsInfo.earned } : {}),
  });
}
