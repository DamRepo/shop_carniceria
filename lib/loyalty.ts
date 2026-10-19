import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Beneficio de bienvenida: 10% sobre el subtotal de productos (sin envío) en la
 * primera compra de un cliente registrado. Montos en centavos enteros.
 *
 * Ciclo de vida de la fila WelcomeBenefit:
 *   reserveWelcome      → crea RESERVED (con orderId)
 *   settleWelcomeOnPaid → RESERVED → USED al confirmarse el pago
 *   releaseWelcome      → borra la fila RESERVED (rollback/cancelación/expiración)
 *
 * El flag LOYALTY_ENABLED solo apaga la cotización y la reserva. settle y
 * release siempre corren, para no dejar reservas trabadas si se apaga el flag
 * con pedidos en curso. Viven en lib/loyalty-lifecycle.ts (sin "server-only",
 * para que el cron de Talo pueda usarlas) y se re-exportan desde acá.
 */

export { settleWelcomeOnPaid, releaseWelcome } from "@/lib/loyalty-lifecycle";

type DbClient = PrismaClient | Prisma.TransactionClient;

const WELCOME_PERCENT = 10;

export function isLoyaltyEnabled(): boolean {
  return process.env.LOYALTY_ENABLED === "true";
}

/** 10% del subtotal, redondeado hacia abajo a pesos enteros. */
export function computeWelcomeDiscountCents(subtotalCents: number): number {
  if (!Number.isFinite(subtotalCents) || subtotalCents <= 0) return 0;
  return Math.floor((subtotalCents * WELCOME_PERCENT) / 100 / 100) * 100;
}

function normalizeEmail(email: string | null | undefined): string | null {
  const e = email?.trim().toLowerCase();
  return e ? e : null;
}

export type WelcomeIneligibleReason =
  | "DISABLED"
  | "NOT_LOGGED_IN"
  | "USER_NOT_FOUND"
  | "NOT_CUSTOMER"
  | "ALREADY_CLAIMED"
  | "PREVIOUS_ORDER"
  | "ZERO_DISCOUNT";

export type WelcomeQuote =
  | { eligible: true; discountCents: number }
  | { eligible: false; discountCents: 0; reason: WelcomeIneligibleReason };

export interface WelcomeQuoteInput {
  /** Usuario de la sesión. null/undefined = invitado. */
  userId: string | null | undefined;
  /** Email ingresado en el checkout (puede diferir del de la cuenta). */
  checkoutEmail?: string | null;
  /** Subtotal de productos tal como se paga (con ofertas y combos), sin envío. */
  subtotalCents: number;
}

function ineligible(reason: WelcomeIneligibleReason): WelcomeQuote {
  return { eligible: false, discountCents: 0, reason };
}

/**
 * Calcula si corresponde la bienvenida. Solo lee.
 * Llamar ANTES de crear la orden del pedido actual: si no, esa misma orden
 * cuenta como "orden previa".
 */
export async function computeWelcomeQuote(
  input: WelcomeQuoteInput,
  tx?: DbClient
): Promise<WelcomeQuote> {
  if (!isLoyaltyEnabled()) return ineligible("DISABLED");
  if (!input.userId) return ineligible("NOT_LOGGED_IN");

  const db = tx ?? prisma;

  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, role: true, welcomeBenefit: { select: { id: true } } },
  });
  if (!user) return ineligible("USER_NOT_FOUND");
  if (user.role !== "CUSTOMER") return ineligible("NOT_CUSTOMER");
  if (user.welcomeBenefit) return ineligible("ALREADY_CLAIMED");

  const emails = Array.from(
    new Set([normalizeEmail(user.email), normalizeEmail(input.checkoutEmail)].filter(
      (e): e is string => e !== null
    ))
  );

  // Cualquier orden no cancelada del usuario o con su email (incluye invitado).
  // SQL crudo para normalizar también el email guardado (órdenes viejas pueden
  // no estar en minúsculas o tener espacios).
  const emailFilter =
    emails.length > 0
      ? Prisma.sql`OR lower(trim("email")) IN (${Prisma.join(emails)})`
      : Prisma.empty;
  const previous = await db.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Order"
    WHERE "status" <> 'CANCELLED'::"OrderStatus"
      AND ("userId" = ${user.id} ${emailFilter})
    LIMIT 1
  `;
  if (previous.length > 0) return ineligible("PREVIOUS_ORDER");

  const discountCents = computeWelcomeDiscountCents(input.subtotalCents);
  if (discountCents <= 0) return ineligible("ZERO_DISCOUNT");

  return { eligible: true, discountCents };
}

export class WelcomeBenefitError extends Error {
  constructor(
    message: string,
    public readonly code: "DISABLED" | "ALREADY_CLAIMED" | "INVALID_AMOUNT"
  ) {
    super(message);
    this.name = "WelcomeBenefitError";
  }
}

/** Mensaje para el cliente cuando la bienvenida ya no está disponible. */
export const WELCOME_ALREADY_CLAIMED_MESSAGE =
  "Tu descuento de bienvenida ya fue usado o está aplicado en otro pedido en curso. Volvé a cargar el carrito para ver el total actualizado.";

/**
 * Crea la reserva RESERVED. El unique de userId garantiza una sola bienvenida
 * por usuario aunque haya checkouts concurrentes.
 * Ojo: un P2002 dentro de una transacción interactiva de Postgres la deja
 * abortada; quien llama debe dejar que el error corte la transacción.
 */
export async function reserveWelcome(
  tx: DbClient | null | undefined,
  params: { userId: string; orderId: string; discountCents: number }
): Promise<void> {
  if (!isLoyaltyEnabled()) {
    throw new WelcomeBenefitError(
      "El beneficio de bienvenida no está disponible en este momento.",
      "DISABLED"
    );
  }
  if (!Number.isInteger(params.discountCents) || params.discountCents <= 0) {
    throw new WelcomeBenefitError("Monto de descuento de bienvenida inválido.", "INVALID_AMOUNT");
  }

  const db = tx ?? prisma;
  try {
    await db.welcomeBenefit.create({
      data: {
        userId: params.userId,
        orderId: params.orderId,
        status: "RESERVED",
        discountCents: params.discountCents,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new WelcomeBenefitError(WELCOME_ALREADY_CLAIMED_MESSAGE, "ALREADY_CLAIMED");
    }
    throw err;
  }
}
