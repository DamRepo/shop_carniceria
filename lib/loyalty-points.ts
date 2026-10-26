import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  computeOrderEarnablePoints,
  computePointsEarned,
  isPointsEnabled,
  isPointsPaymentMethod,
  MAX_COVER_PERCENT,
  MIN_BALANCE_TO_REDEEM,
  POINT_VALUE_CENTS,
  REDEEM_BLOCK,
} from "@/lib/loyalty-points-lifecycle";

/**
 * Sistema de puntos. Montos en centavos enteros.
 *
 * - Se gana 1 punto cada $100 de productos pagados (sin envío, después de
 *   bienvenida y de puntos canjeados), cuando el pedido queda PAID.
 * - 10 puntos = $50. Se canjea de a bloques de 10, con saldo mínimo de 100,
 *   hasta el 50% del subtotal de productos (después de la bienvenida).
 * - Cada lote vence a los 45 días corridos. El saldo se calcula al leer.
 * - Solo efectivo y Talo. La compra con bienvenida no suma.
 *
 * Ciclo de vida del canje (PointsReservation):
 *   reservePoints            → RESERVED (descuenta remaining de los lotes)
 *   settlePointsOnPaid       → USED al confirmarse el pago
 *   releasePoints            → RELEASED, devuelve los puntos a sus lotes
 *   revokePointsOnPaidCancel → pedido pagado y cancelado: devuelve el canje
 *                              y quita los puntos ganados por ese pedido
 *
 * El flag LOYALTY_POINTS_ENABLED (apagado por defecto) solo apaga la
 * cotización, la reserva y la acreditación. Las funciones de ciclo de vida
 * viven en lib/loyalty-points-lifecycle.ts (sin "server-only", para el cron
 * de Talo) y se re-exportan desde acá.
 */

export {
  awardPointsOnPaid,
  computeOrderEarnablePoints,
  computePointsEarned,
  isPointsEnabled,
  releasePoints,
  revokePointsOnPaidCancel,
  settlePointsOnPaid,
  type RevokeResult,
} from "@/lib/loyalty-points-lifecycle";

type DbClient = PrismaClient | Prisma.TransactionClient;

export function pointsToCents(points: number): number {
  return points * POINT_VALUE_CENTS;
}

/**
 * Máximo canjeable: múltiplo de 10, sin pasar el saldo ni el 50% del
 * subtotal de productos. 0 si el saldo no llega al mínimo de 100.
 * productSubtotalCents: subtotal de productos después de la bienvenida, sin envío.
 */
export function maxRedeemablePoints(balance: number, productSubtotalCents: number): number {
  if (!Number.isFinite(balance) || balance < MIN_BALANCE_TO_REDEEM) return 0;
  if (!Number.isFinite(productSubtotalCents) || productSubtotalCents <= 0) return 0;
  const capCents = Math.floor((productSubtotalCents * MAX_COVER_PERCENT) / 100);
  const capPoints = Math.floor(capCents / POINT_VALUE_CENTS);
  const limit = Math.min(Math.floor(balance), capPoints);
  return Math.floor(limit / REDEEM_BLOCK) * REDEEM_BLOCK;
}

export interface PointsBalance {
  /** Puntos vigentes libres (no vencidos, no revocados, no reservados). */
  available: number;
  /** Próximo lote a vencer con puntos libres, o null. */
  nextExpiry: { points: number; expiresAt: Date } | null;
}

/** Saldo vigente calculado al leer (sin cron). Solo lee. */
export async function getPointsBalance(
  userId: string,
  db?: DbClient,
  now: Date = new Date()
): Promise<PointsBalance> {
  const client = db ?? prisma;
  const where = { userId, revokedAt: null, expiresAt: { gt: now }, remaining: { gt: 0 } };
  const [sum, next] = await Promise.all([
    client.pointsLot.aggregate({ where, _sum: { remaining: true } }),
    client.pointsLot.findFirst({
      where,
      orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
      select: { remaining: true, expiresAt: true },
    }),
  ]);
  return {
    available: sum._sum.remaining ?? 0,
    nextExpiry: next ? { points: next.remaining, expiresAt: next.expiresAt } : null,
  };
}

export type PointsIneligibleReason =
  | "DISABLED"
  | "NOT_LOGGED_IN"
  | "USER_NOT_FOUND"
  | "NOT_CUSTOMER"
  | "METHOD_NOT_ALLOWED"
  | "WITH_WELCOME"
  | "NOT_BLOCK_MULTIPLE"
  | "BELOW_MINIMUM"
  | "EXCEEDS_BALANCE"
  | "EXCEEDS_CAP";

export type PointsQuote =
  | { ok: true; points: number; discountCents: number }
  | { ok: false; reason: PointsIneligibleReason };

export interface PointsQuoteInput {
  /** Usuario de la sesión. null/undefined = invitado. */
  userId: string | null | undefined;
  /** Subtotal de productos tal como se paga (con ofertas y combos), sin envío. */
  subtotalCents: number;
  /** Descuento de bienvenida del mismo pedido (0 si no aplica). */
  welcomeDiscountCents: number;
  /** Puntos que pide canjear el cliente. Nunca se confía: se valida todo. */
  requestedPoints: number;
  paymentMethod: string;
}

function rejected(reason: PointsIneligibleReason): PointsQuote {
  return { ok: false, reason };
}

/**
 * Chequeos que no dependen del saldo ni del monto pedido. Devuelve el motivo
 * de rechazo, o null si la cuenta y el pedido pueden canjear.
 */
async function checkPointsAccount(
  input: Omit<PointsQuoteInput, "requestedPoints">,
  client: DbClient
): Promise<PointsIneligibleReason | null> {
  if (!isPointsEnabled()) return "DISABLED";
  if (!input.userId) return "NOT_LOGGED_IN";
  if (!isPointsPaymentMethod(input.paymentMethod)) return "METHOD_NOT_ALLOWED";
  // No puede coincidir en la práctica (en la primera compra el saldo es 0),
  // pero se bloquea igual del lado del servidor.
  if (input.welcomeDiscountCents > 0) return "WITH_WELCOME";

  const user = await client.user.findUnique({
    where: { id: input.userId },
    select: { role: true },
  });
  if (!user) return "USER_NOT_FOUND";
  if (user.role !== "CUSTOMER") return "NOT_CUSTOMER";
  return null;
}

/** Valida un pedido de canje contra todas las reglas. Solo lee. */
export async function computePointsQuote(
  input: PointsQuoteInput,
  db?: DbClient
): Promise<PointsQuote> {
  const client = db ?? prisma;
  const reason = await checkPointsAccount(input, client);
  if (reason) return rejected(reason);

  const requested = input.requestedPoints;
  if (!Number.isInteger(requested) || requested <= 0 || requested % REDEEM_BLOCK !== 0) {
    return rejected("NOT_BLOCK_MULTIPLE");
  }

  const { available } = await getPointsBalance(input.userId as string, client);
  if (available < MIN_BALANCE_TO_REDEEM) return rejected("BELOW_MINIMUM");
  if (requested > available) return rejected("EXCEEDS_BALANCE");

  const productSubtotal = input.subtotalCents - input.welcomeDiscountCents;
  if (requested > maxRedeemablePoints(available, productSubtotal)) return rejected("EXCEEDS_CAP");

  return { ok: true, points: requested, discountCents: pointsToCents(requested) };
}

/**
 * Cotiza el canje que decide el servidor: el máximo canjeable con el saldo
 * vigente (bloques de 10, tope 50%, mínimo 100). El cliente solo pide "usar
 * puntos"; nunca se toma un monto del navegador. Solo lee.
 */
export async function computeMaxPointsQuote(
  input: Omit<PointsQuoteInput, "requestedPoints">,
  db?: DbClient
): Promise<PointsQuote> {
  const client = db ?? prisma;
  const reason = await checkPointsAccount(input, client);
  if (reason) return rejected(reason);

  const { available } = await getPointsBalance(input.userId as string, client);
  if (available < MIN_BALANCE_TO_REDEEM) return rejected("BELOW_MINIMUM");

  const points = maxRedeemablePoints(available, input.subtotalCents - input.welcomeDiscountCents);
  if (points <= 0) return rejected("EXCEEDS_CAP");

  return { ok: true, points, discountCents: pointsToCents(points) };
}

/** Mensaje para el cliente según el motivo por el que no se pueden usar puntos. */
export function pointsRejectionMessage(reason: PointsIneligibleReason): string {
  switch (reason) {
    case "DISABLED":
      return "El canje de puntos no está disponible en este momento.";
    case "NOT_LOGGED_IN":
      return "Iniciá sesión para usar tus puntos.";
    case "USER_NOT_FOUND":
    case "NOT_CUSTOMER":
      return "Esta cuenta no puede usar puntos.";
    case "METHOD_NOT_ALLOWED":
      return "Los puntos solo se pueden usar pagando en efectivo o por transferencia.";
    case "WITH_WELCOME":
      return "Los puntos no se combinan con el descuento de bienvenida.";
    case "BELOW_MINIMUM":
      return `Necesitás al menos ${MIN_BALANCE_TO_REDEEM} puntos vigentes para canjear.`;
    case "EXCEEDS_CAP":
      return "El total de productos es muy bajo para canjear puntos.";
    case "NOT_BLOCK_MULTIPLE":
    case "EXCEEDS_BALANCE":
      return POINTS_CONFLICT_MESSAGE;
  }
}

/** Cotización nueva que el servidor manda cuando el canje no coincide con lo que vio el cliente. */
export interface PointsChange {
  points: number;
  discountCents: number;
  /** Motivo por el que ya no se puede canjear, o null si solo cambió la cantidad. */
  reason: PointsIneligibleReason | null;
}

export class PointsError extends Error {
  constructor(
    message: string,
    public readonly code: "DISABLED" | "CONFLICT" | "INVALID_AMOUNT" | "CHANGED",
    public readonly change?: PointsChange
  ) {
    super(message);
    this.name = "PointsError";
  }
}

/** Cuerpo de la respuesta 409 para un PointsError (code con prefijo POINTS_). */
export function pointsErrorBody(e: PointsError) {
  return { error: e.message, code: `POINTS_${e.code}`, ...(e.change ?? {}) };
}

/** Mensaje para el cliente cuando el saldo cambió entre la cotización y la reserva. */
export const POINTS_CONFLICT_MESSAGE =
  "Tu saldo de puntos cambió o está aplicado en otro pedido en curso. Volvé a cargar el carrito para ver el total actualizado.";

export const POINTS_CHANGED_MESSAGE = "Tu saldo cambió, revisá el total antes de confirmar.";

/** Motivos que dependen del saldo: para el cliente son "tu saldo cambió". */
const BALANCE_REASONS: readonly PointsIneligibleReason[] = [
  "BELOW_MINIMUM",
  "EXCEEDS_CAP",
  "EXCEEDS_BALANCE",
  "NOT_BLOCK_MULTIPLE",
];

/**
 * Resuelve el canje de un pedido con usePoints: true. Recalcula el máximo
 * canjeable y lo compara con expectedPoints (los puntos que vio el cliente al
 * confirmar). Si no coincide, o ya no se puede canjear, lanza PointsError
 * CHANGED con la cotización nueva, ANTES de crear el pedido o tocar stock.
 * Nunca se usa expectedPoints como monto: solo se compara.
 */
export async function resolvePointsRedemption(
  input: Omit<PointsQuoteInput, "requestedPoints"> & { expectedPoints: unknown },
  db?: DbClient
): Promise<{ points: number; discountCents: number }> {
  const { expectedPoints, ...quoteInput } = input;
  const quote = await computeMaxPointsQuote(quoteInput, db);
  if (quote.ok && expectedPoints === quote.points) {
    return { points: quote.points, discountCents: quote.discountCents };
  }
  if (quote.ok) {
    throw new PointsError(POINTS_CHANGED_MESSAGE, "CHANGED", {
      points: quote.points,
      discountCents: quote.discountCents,
      reason: null,
    });
  }
  // Incluye DISABLED: con el flag apagado el cliente que vio el descuento
  // recibe el 409 y el total sin puntos, nunca el precio completo en silencio.
  const message = BALANCE_REASONS.includes(quote.reason)
    ? POINTS_CHANGED_MESSAGE
    : `${pointsRejectionMessage(quote.reason)} Revisá el total antes de confirmar.`;
  throw new PointsError(message, "CHANGED", { points: 0, discountCents: 0, reason: quote.reason });
}

/**
 * Reserva el canje dentro de la MISMA transacción que crea el pedido.
 * Consume primero los lotes que vencen antes. Cada lote se descuenta con un
 * update condicional (remaining >= n): si otra pestaña tomó esos puntos, no
 * actualiza y se lanza CONFLICT, que corta toda la transacción.
 * Ojo: un P2002 dentro de una transacción interactiva de Postgres la deja
 * abortada; quien llama debe dejar que el error corte la transacción.
 */
export async function reservePoints(
  tx: Prisma.TransactionClient,
  params: { userId: string; orderId: string; points: number; discountCents: number },
  now: Date = new Date()
): Promise<void> {
  if (!isPointsEnabled()) {
    throw new PointsError("El canje de puntos no está disponible en este momento.", "DISABLED");
  }
  const { userId, orderId, points, discountCents } = params;
  if (
    !Number.isInteger(points) ||
    points <= 0 ||
    points % REDEEM_BLOCK !== 0 ||
    discountCents !== pointsToCents(points)
  ) {
    throw new PointsError("Cantidad de puntos inválida.", "INVALID_AMOUNT");
  }

  // FOR UPDATE en orden fijo (vencimiento, id): dos checkouts del mismo
  // cliente se serializan acá, así el segundo calcula el saldo con lo que dejó
  // el primero y no puede saltearse el mínimo de 100. returnAllocations
  // (liberar/devolver) bloquea en el mismo orden para no generar deadlocks.
  // El vencimiento se filtra en JS: comparar fechas en SQL crudo depende de la
  // zona horaria de la sesión (la columna es timestamp sin zona, en UTC).
  const locked = await tx.$queryRaw<{ id: string; remaining: number; expiresAt: Date }[]>`
    SELECT "id", "remaining", "expiresAt" FROM "PointsLot"
    WHERE "userId" = ${userId} AND "revokedAt" IS NULL AND "remaining" > 0
    ORDER BY "expiresAt" ASC, "id" ASC
    FOR UPDATE
  `;
  const lots = locked.filter((l) => l.expiresAt.getTime() > now.getTime());
  const available = lots.reduce((acc, l) => acc + l.remaining, 0);
  if (available < MIN_BALANCE_TO_REDEEM || available < points) {
    throw new PointsError(POINTS_CONFLICT_MESSAGE, "CONFLICT");
  }

  const allocations: { lotId: string; points: number }[] = [];
  let left = points;
  for (const lot of lots) {
    if (left === 0) break;
    const take = Math.min(lot.remaining, left);
    const { count } = await tx.pointsLot.updateMany({
      where: { id: lot.id, revokedAt: null, expiresAt: { gt: now }, remaining: { gte: take } },
      data: { remaining: { decrement: take } },
    });
    if (count === 0) throw new PointsError(POINTS_CONFLICT_MESSAGE, "CONFLICT");
    allocations.push({ lotId: lot.id, points: take });
    left -= take;
  }
  if (left > 0) throw new PointsError(POINTS_CONFLICT_MESSAGE, "CONFLICT");

  try {
    await tx.pointsReservation.create({
      data: {
        orderId,
        userId,
        points,
        status: "RESERVED",
        allocations: { create: allocations },
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new PointsError(POINTS_CONFLICT_MESSAGE, "CONFLICT");
    }
    throw err;
  }
  await tx.pointsMovement.create({
    data: { userId, orderId, type: "RESERVE", points },
  });
}

// --- Lectura para pantallas -------------------------------------------------

export interface CheckoutPointsPreview {
  /** Saldo vigente libre. */
  balance: number;
  /** Equivalente del saldo en pesos (centavos). */
  balanceCents: number;
  canRedeem: boolean;
  /** Máximo canjeable en este carrito (0 si no se puede). */
  maxPoints: number;
  discountCents: number;
  reason: PointsIneligibleReason | null;
  /** Puntos que faltan para llegar al mínimo de canje (0 si ya llega). */
  missingPoints: number;
  /** Puntos que ganaría si usa sus puntos / si no los usa (sin envío). */
  earnIfRedeem: number;
  earnIfNotRedeem: number;
}

/** Motivos por los que esta compra tampoco suma puntos. */
const NO_EARN_REASONS: readonly PointsIneligibleReason[] = [
  "DISABLED",
  "NOT_LOGGED_IN",
  "USER_NOT_FOUND",
  "NOT_CUSTOMER",
  "METHOD_NOT_ALLOWED",
  "WITH_WELCOME",
];

/**
 * Vista previa de puntos para la tarjeta del checkout. Solo lee. El subtotal
 * tiene que venir calculado en el servidor (computeCartSubtotalCents).
 */
export async function computeCheckoutPointsPreview(
  input: Omit<PointsQuoteInput, "requestedPoints">,
  db?: DbClient
): Promise<CheckoutPointsPreview> {
  const client = db ?? prisma;
  const [quote, balance] = await Promise.all([
    computeMaxPointsQuote(input, client),
    input.userId ? getPointsBalance(input.userId, client) : Promise.resolve({ available: 0 }),
  ]);
  const reason = quote.ok ? null : quote.reason;
  const discountCents = quote.ok ? quote.discountCents : 0;
  const earns = reason === null || !NO_EARN_REASONS.includes(reason);
  const productCash = input.subtotalCents - input.welcomeDiscountCents;

  return {
    balance: balance.available,
    balanceCents: pointsToCents(balance.available),
    canRedeem: quote.ok,
    maxPoints: quote.ok ? quote.points : 0,
    discountCents,
    reason,
    missingPoints:
      reason === "BELOW_MINIMUM" ? Math.max(0, MIN_BALANCE_TO_REDEEM - balance.available) : 0,
    earnIfRedeem: earns ? computePointsEarned(productCash - discountCents) : 0,
    earnIfNotRedeem: earns ? computePointsEarned(productCash) : 0,
  };
}

export type PointsHistoryKind = "EARNED" | "USED" | "EXPIRED" | "REVOKED" | "RESTORED";

export interface PointsHistoryEntry {
  kind: PointsHistoryKind;
  points: number;
  date: Date;
  orderNumber: string | null;
}

const MOVEMENT_KIND: Partial<Record<string, PointsHistoryKind>> = {
  EARN: "EARNED",
  SETTLE: "USED",
  REVOKE: "REVOKED",
  RESTORE: "RESTORED",
};

/**
 * Historial reciente para el perfil: ganados, usados, devueltos, revocados y
 * vencidos (los vencidos no son movimientos: salen de los lotes vencidos con
 * puntos sin usar). Las reservas y liberaciones son internas y no se muestran.
 */
export async function getPointsHistory(
  userId: string,
  limit = 20,
  db?: DbClient,
  now: Date = new Date()
): Promise<PointsHistoryEntry[]> {
  const client = db ?? prisma;
  const [movements, expiredLots] = await Promise.all([
    client.pointsMovement.findMany({
      where: { userId, type: { in: ["EARN", "SETTLE", "REVOKE", "RESTORE"] }, points: { gt: 0 } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { type: true, points: true, createdAt: true, order: { select: { orderNumber: true } } },
    }),
    client.pointsLot.findMany({
      where: { userId, revokedAt: null, expiresAt: { lte: now }, remaining: { gt: 0 } },
      orderBy: { expiresAt: "desc" },
      take: limit,
      select: { remaining: true, expiresAt: true, sourceOrder: { select: { orderNumber: true } } },
    }),
  ]);

  const entries: PointsHistoryEntry[] = [];
  for (const m of movements) {
    const kind = MOVEMENT_KIND[m.type];
    if (kind) {
      entries.push({ kind, points: m.points, date: m.createdAt, orderNumber: m.order?.orderNumber ?? null });
    }
  }
  for (const l of expiredLots) {
    entries.push({
      kind: "EXPIRED",
      points: l.remaining,
      date: l.expiresAt,
      orderNumber: l.sourceOrder?.orderNumber ?? null,
    });
  }
  return entries.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, limit);
}

export interface OrderPointsInfo {
  /** Puntos que va a sumar cuando se confirme el pago (0 si ya se pagó o no suma). */
  toEarn: number;
  /** Puntos ya acreditados por el pedido (0 si todavía no). */
  earned: number;
}

/**
 * Puntos de un pedido para las pantallas post compra. Solo con el flag
 * prendido y solo para el dueño del pedido (userId de la sesión): a nadie más
 * se le dice nada. null = no mostrar. Solo lee.
 */
export async function getOrderPointsInfo(
  orderId: string | null | undefined,
  sessionUserId: string | null | undefined,
  db?: DbClient
): Promise<OrderPointsInfo | null> {
  if (!isPointsEnabled() || !orderId || !sessionUserId) return null;
  const client = db ?? prisma;
  const order = await client.order.findUnique({
    where: { id: orderId },
    select: {
      userId: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      subtotal: true,
      welcomeDiscount: true,
      pointsDiscount: true,
      pointsEarned: true,
      user: { select: { role: true } },
    },
  });
  if (!order || order.userId !== sessionUserId) return null;

  const earned = order.pointsEarned ?? 0;
  const toEarn =
    earned > 0 || order.paymentStatus === "PAID"
      ? 0
      : computeOrderEarnablePoints({ ...order, userRole: order.user?.role });
  return { toEarn, earned };
}
