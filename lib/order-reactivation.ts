/**
 * Reactivar una orden cancelada no está permitido: al cancelar se devolvió
 * stock, bienvenida y puntos, y volver atrás dejaría descuentos sin respaldo.
 * Sin dependencias de servidor: lo usan la API y la UI del admin.
 */

export const CANCELLED_WITH_LOYALTY_CODE = "CANCELLED_WITH_LOYALTY";

export const CANCELLED_WITH_LOYALTY_MESSAGE =
  "Esta orden usó bienvenida o puntos, y se devolvieron al cancelarla. No se puede reactivar: creá un pedido nuevo.";

export const CANCELLED_MESSAGE =
  "Una orden cancelada no se puede reactivar. Creá un pedido nuevo.";

export interface OrderLoyaltyTrace {
  welcomeDiscount: number | null;
  pointsRedeemed: number | null;
  pointsEarned: number | null;
  hasWelcomeBenefit: boolean;
  hasPointsReservation: boolean;
  hasPointsLot: boolean;
}

/** true si la orden tuvo bienvenida o puntos (canjeados o ganados). */
export function orderHadLoyalty(o: OrderLoyaltyTrace): boolean {
  return (
    (o.welcomeDiscount ?? 0) > 0 ||
    (o.pointsRedeemed ?? 0) > 0 ||
    (o.pointsEarned ?? 0) > 0 ||
    o.hasWelcomeBenefit ||
    o.hasPointsReservation ||
    o.hasPointsLot
  );
}
