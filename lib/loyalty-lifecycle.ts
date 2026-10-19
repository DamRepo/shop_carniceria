import type { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Ciclo de vida de la reserva de bienvenida (ver lib/loyalty.ts).
 *
 * Sin import "server-only" a propósito: lo usa lib/talo-payment-processor.ts,
 * que también corre en scripts/reconcile-talo-payments.ts con tsx fuera del
 * bundler de Next.js, donde "server-only" siempre tira error (mismo motivo que
 * lib/talo.ts). Estas funciones no leen variables de entorno ni secretos.
 *
 * No dependen de LOYALTY_ENABLED: tienen que correr siempre para no dejar
 * reservas trabadas si se apaga el flag con pedidos en curso.
 */

type DbClient = PrismaClient | Prisma.TransactionClient;

/** RESERVED → USED para la orden pagada. Idempotente; corre con el flag apagado. */
export async function settleWelcomeOnPaid(
  tx: DbClient | null | undefined,
  orderId: string
): Promise<number> {
  const db = tx ?? prisma;
  const { count } = await db.welcomeBenefit.updateMany({
    where: { orderId, status: "RESERVED" },
    data: { status: "USED" },
  });
  return count;
}

/** Borra la reserva RESERVED de la orden. Idempotente; corre con el flag apagado. */
export async function releaseWelcome(
  tx: DbClient | null | undefined,
  orderId: string
): Promise<number> {
  const db = tx ?? prisma;
  const { count } = await db.welcomeBenefit.deleteMany({
    where: { orderId, status: "RESERVED" },
  });
  return count;
}
