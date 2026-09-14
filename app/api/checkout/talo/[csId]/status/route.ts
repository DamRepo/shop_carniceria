import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
      orderId: true,
      order: { select: { orderNumber: true } },
    },
  });

  if (!cs) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    status: cs.status,
    taloStatus: cs.taloStatus,
    cvu: cs.taloCvu,
    alias: cs.taloAlias,
    expiresAt: cs.taloExpiresAt,
    total: cs.total, // centavos (igual que el resto de la app) — el cliente lo formatea con formatPrice()
    orderId: cs.orderId,
    orderNumber: cs.order?.orderNumber ?? null,
  });
}
