// Eventos de GA4 para el navegador. Si GA no está configurado
// (NEXT_PUBLIC_GA_ID vacía) o gtag no cargó (bloqueador, red), no hace nada:
// medir nunca debe romper la página. Nunca mandar datos personales acá
// (email, nombre, teléfono).

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim();

type EventParams = Record<string, string | number>;

/** Devuelve true solo si el evento se le entregó a gtag. */
export function trackEvent(name: string, params: EventParams = {}): boolean {
  if (!GA_ID || typeof window === "undefined" || typeof window.gtag !== "function") {
    return false;
  }

  try {
    window.gtag("event", name, params);
    return true;
  } catch {
    return false;
  }
}

export const WELCOME_PROMOTION = {
  promotion_id: "welcome10",
  promotion_name: "Bienvenida 10%",
  creative_slot: "home_banner",
} as const;

export const WELCOME_COUPON = "BIENVENIDA10";

/** Centavos enteros → pesos para GA4. */
function centsToPesos(cents: number): number {
  return Math.round(cents) / 100;
}

export function trackPurchase(args: {
  transactionId: string;
  totalCents: number;
  welcomeDiscountCents: number;
  paymentType: "cash" | "talo";
}): boolean {
  const params: EventParams = {
    transaction_id: args.transactionId,
    value: centsToPesos(args.totalCents),
    currency: "ARS",
    payment_type: args.paymentType,
  };
  if (args.welcomeDiscountCents > 0) params.coupon = WELCOME_COUPON;

  return trackEvent("purchase", params);
}

// Puntos: solo se llaman desde pantallas que existen con LOYALTY_POINTS_ENABLED
// prendido (el flag lo decide el servidor), así que con el flag apagado no se
// manda nada.

/** El cliente prende o apaga "Usar mis puntos" en el checkout. */
export function trackPointsToggle(args: {
  on: boolean;
  points: number;
  discountCents: number;
}): boolean {
  return trackEvent("points_toggle", {
    state: args.on ? "on" : "off",
    points: args.points,
    value: centsToPesos(args.discountCents),
    currency: "ARS",
  });
}

/** Compra con puntos canjeados. Importes del servidor. */
export function trackPointsRedeem(args: {
  transactionId: string;
  points: number;
  discountCents: number;
  paymentType: "cash" | "talo";
}): boolean {
  return trackEvent("points_redeem", {
    transaction_id: args.transactionId,
    points: args.points,
    value: centsToPesos(args.discountCents),
    currency: "ARS",
    payment_type: args.paymentType,
  });
}
