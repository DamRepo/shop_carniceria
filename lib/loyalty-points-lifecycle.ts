import type { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Ciclo de vida de los puntos (ver lib/loyalty-points.ts).
 *
 * Sin import "server-only" a propósito, igual que lib/loyalty-lifecycle.ts:
 * lo va a usar lib/talo-payment-processor.ts, que también corre en
 * scripts/reconcile-talo-payments.ts con tsx fuera del bundler de Next.js.
 * La única variable de entorno que se lee es el flag (no es un secreto).
 *
 * settle, release y revoke NO dependen de LOYALTY_POINTS_ENABLED: tienen que
 * correr siempre para no dejar reservas trabadas ni puntos de pedidos
 * cancelados si se apaga el flag con pedidos en curso. award sí lo respeta:
 * con el flag apagado no se acreditan lotes nuevos.
 *
 * PointsMovement.points es siempre la cantidad (positiva); el tipo indica el
 * sentido. Un movimiento de cada tipo por pedido (@@unique([orderId, type])).
 */

type DbClient = PrismaClient | Prisma.TransactionClient;

/** 1 punto cada $100 de productos pagados (10.000 centavos). */
export const CENTS_PER_EARNED_POINT = 10_000;
/** Cada punto vale $5 al canjear (10 puntos = $50). */
export const POINT_VALUE_CENTS = 500;
/** Se canjea de a bloques de 10 puntos. */
export const REDEEM_BLOCK = 10;
/** Saldo vigente mínimo para poder canjear. */
export const MIN_BALANCE_TO_REDEEM = 100;
/** Los puntos cubren como máximo este % del subtotal de productos. */
export const MAX_COVER_PERCENT = 50;
/** Días corridos de vigencia de cada lote. */
export const LOT_VALIDITY_DAYS = 45;
/** Métodos de pago con los que se ganan y se usan puntos. */
export const POINTS_PAYMENT_METHODS = ["CASH", "TALO_PAY"] as const;

export function isPointsEnabled(): boolean {
  return process.env.LOYALTY_POINTS_ENABLED === "true";
}

export function isPointsPaymentMethod(method: string): boolean {
  return (POINTS_PAYMENT_METHODS as readonly string[]).includes(method);
}

/** Puntos ganados por un monto de productos pagado en plata. Redondeo hacia abajo. */
export function computePointsEarned(productCashCents: number): number {
  if (!Number.isFinite(productCashCents) || productCashCents <= 0) return 0;
  return Math.floor(productCashCents / CENTS_PER_EARNED_POINT);
}

/** Corre fn dentro de una transacción: la recibida, o una nueva si db no lo es. */
async function inTransaction<T>(
  db: DbClient | null | undefined,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const client = db ?? prisma;
  if ("$transaction" in client) return client.$transaction(fn);
  return fn(client);
}

/**
 * Devuelve los puntos de cada asignación a su lote de origen. Si el lote ya
 * venció o fue revocado, los puntos vuelven pero no cuentan en el saldo.
 * Recorre los lotes en el mismo orden en que los bloquea reservePoints
 * (vencimiento, id) para no generar deadlocks con un checkout concurrente.
 */
async function returnAllocations(tx: Prisma.TransactionClient, reservationId: string): Promise<void> {
  const allocations = await tx.pointsReservationAllocation.findMany({
    where: { reservationId },
    orderBy: [{ lot: { expiresAt: "asc" } }, { lotId: "asc" }],
    select: { lotId: true, points: true },
  });
  for (const a of allocations) {
    await tx.pointsLot.update({
      where: { id: a.lotId },
      data: { remaining: { increment: a.points } },
    });
  }
}

/** RESERVED → USED para el pedido pagado. Idempotente; corre con el flag apagado. */
export async function settlePointsOnPaid(
  tx: DbClient | null | undefined,
  orderId: string
): Promise<number> {
  return inTransaction(tx, async (db) => {
    const reservation = await db.pointsReservation.findUnique({
      where: { orderId },
      select: { id: true, userId: true, points: true },
    });
    if (!reservation) return 0;

    const { count } = await db.pointsReservation.updateMany({
      where: { id: reservation.id, status: "RESERVED" },
      data: { status: "USED" },
    });
    if (count === 0) return 0;

    await db.pointsMovement.create({
      data: { userId: reservation.userId, orderId, type: "SETTLE", points: reservation.points },
    });
    return count;
  });
}

/**
 * RESERVED → RELEASED y devuelve los puntos a sus lotes (rollback, cancelación
 * o expiración antes de pagar). Idempotente; corre con el flag apagado.
 */
export async function releasePoints(
  tx: DbClient | null | undefined,
  orderId: string
): Promise<number> {
  return inTransaction(tx, async (db) => {
    const reservation = await db.pointsReservation.findUnique({
      where: { orderId },
      select: { id: true, userId: true, points: true },
    });
    if (!reservation) return 0;

    // Guard: solo la llamada que gana el cambio de estado devuelve puntos.
    const { count } = await db.pointsReservation.updateMany({
      where: { id: reservation.id, status: "RESERVED" },
      data: { status: "RELEASED" },
    });
    if (count === 0) return 0;

    await returnAllocations(db, reservation.id);
    await db.pointsMovement.create({
      data: { userId: reservation.userId, orderId, type: "RELEASE", points: reservation.points },
    });
    return count;
  });
}

/** Lo que hace falta de un pedido para saber cuántos puntos suma. */
export interface EarnableOrder {
  userId: string | null;
  userRole: string | null | undefined;
  status: string;
  paymentMethod: string;
  subtotal: number;
  welcomeDiscount: number | null;
  pointsDiscount: number | null;
}

/**
 * Puntos que suma un pedido si se paga (sin mirar el pago ni el flag). Una
 * sola regla para acreditar (awardPointsOnPaid) y para mostrar "Ganás N
 * puntos" (getOrderPointsInfo): invitado, no CUSTOMER, cancelado, método fuera
 * de efectivo/Talo o pedido con bienvenida → 0.
 * Base: subtotal − bienvenida − descuento por puntos (sin envío).
 */
export function computeOrderEarnablePoints(order: EarnableOrder): number {
  if (!order.userId || order.userRole !== "CUSTOMER") return 0;
  if (order.status === "CANCELLED") return 0;
  if (!isPointsPaymentMethod(order.paymentMethod)) return 0;
  if ((order.welcomeDiscount ?? 0) > 0) return 0;
  return computePointsEarned(order.subtotal - (order.welcomeDiscount ?? 0) - (order.pointsDiscount ?? 0));
}

/**
 * Acredita el lote de puntos de un pedido recién pagado. Devuelve los puntos
 * acreditados (0 si no corresponde o si ya se acreditó).
 *
 * Llamar solo desde quien ganó el guard de pago (count > 0), en la misma
 * transacción. No acredita si: flag apagado, invitado, no CUSTOMER, pedido no
 * PAID o cancelado, método fuera de efectivo/Talo, o pedido con bienvenida.
 * Base: subtotal − bienvenida − descuento por puntos (sin envío).
 */
export async function awardPointsOnPaid(
  tx: DbClient | null | undefined,
  orderId: string,
  now: Date = new Date()
): Promise<number> {
  if (!isPointsEnabled()) return 0;

  return inTransaction(tx, async (db) => {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        userId: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        subtotal: true,
        welcomeDiscount: true,
        pointsDiscount: true,
        user: { select: { role: true } },
        pointsLot: { select: { id: true } },
      },
    });
    if (!order || order.paymentStatus !== "PAID" || !order.userId) return 0;
    // Ya acreditado. El @unique de sourceOrderId es la red de seguridad.
    if (order.pointsLot) return 0;

    const earned = computeOrderEarnablePoints({ ...order, userRole: order.user?.role });
    if (earned <= 0) return 0;
    const userId = order.userId;

    await db.pointsLot.create({
      data: {
        userId,
        earned,
        remaining: earned,
        expiresAt: new Date(now.getTime() + LOT_VALIDITY_DAYS * 24 * 60 * 60 * 1000),
        sourceOrderId: orderId,
      },
    });
    await db.pointsMovement.create({
      data: { userId, orderId, type: "EARN", points: earned },
    });
    await db.order.update({ where: { id: orderId }, data: { pointsEarned: earned } });

    return earned;
  });
}

export interface RevokeResult {
  /** Puntos ganados por el pedido que se quitaron (lo que quedaba del lote). */
  revoked: number;
  /** Puntos ganados que ya se habían usado y no se pudieron quitar. */
  shortfall: number;
  /** Puntos canjeados en el pedido que se devolvieron a sus lotes. */
  restored: number;
}

/**
 * Cancelación de un pedido YA PAGADO: devuelve los puntos canjeados (a sus
 * lotes originales, con su vencimiento original) y quita los ganados hasta
 * donde alcance lo que queda del lote. Nunca deja saldo negativo.
 * Idempotente; corre con el flag apagado. Para un pedido sin pagar usar
 * releasePoints.
 */
export async function revokePointsOnPaidCancel(
  tx: DbClient | null | undefined,
  orderId: string,
  now: Date = new Date()
): Promise<RevokeResult> {
  return inTransaction(tx, async (db) => {
    let restored = 0;
    const reservation = await db.pointsReservation.findUnique({
      where: { orderId },
      select: { id: true, userId: true, points: true },
    });
    if (reservation) {
      const { count } = await db.pointsReservation.updateMany({
        where: { id: reservation.id, status: "USED" },
        data: { status: "RELEASED" },
      });
      if (count > 0) {
        await returnAllocations(db, reservation.id);
        await db.pointsMovement.create({
          data: { userId: reservation.userId, orderId, type: "RESTORE", points: reservation.points },
        });
        restored = reservation.points;
      }
    }

    let revoked = 0;
    let shortfall = 0;
    // FOR UPDATE: congela remaining mientras se revoca, así un canje
    // concurrente no puede tomar puntos del lote entre la lectura y el update.
    const lots = await db.$queryRaw<{ id: string; userId: string; earned: number; remaining: number }[]>`
      SELECT "id", "userId", "earned", "remaining" FROM "PointsLot"
      WHERE "sourceOrderId" = ${orderId} AND "revokedAt" IS NULL
      FOR UPDATE
    `;
    const lot = lots[0];
    if (lot) {
      await db.pointsLot.update({
        where: { id: lot.id },
        data: { remaining: 0, revokedAt: now },
      });
      revoked = lot.remaining;
      shortfall = lot.earned - lot.remaining;
      await db.pointsMovement.create({
        data: { userId: lot.userId, orderId, type: "REVOKE", points: revoked },
      });
    }

    return { revoked, shortfall, restored };
  });
}
