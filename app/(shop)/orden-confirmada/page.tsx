import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrderPointsInfo, isPointsEnabled } from "@/lib/loyalty-points";
import { OrdenConfirmadaClient } from "./OrdenConfirmadaClient";

// El flag de puntos se lee en el servidor en cada request (no queda fijo en
// el build), igual que /checkout/metodo-pago.
export const dynamic = "force-dynamic";

/**
 * "Ganás N puntos cuando se confirme tu pago": sale de la orden, nunca de la
 * URL. Con el flag apagado no se consulta nada y la página queda igual.
 */
export default async function OrdenConfirmadaPage({
  searchParams,
}: {
  searchParams: { orderId?: string | string[] };
}) {
  let pointsToEarn = 0;
  if (isPointsEnabled()) {
    const orderId = typeof searchParams.orderId === "string" ? searchParams.orderId : null;
    try {
      const session = await getServerSession(authOptions).catch(() => null);
      const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
      const info = await getOrderPointsInfo(orderId, userId);
      pointsToEarn = info?.toEarn ?? 0;
    } catch (e) {
      // Si falla la lectura de puntos, la confirmación se muestra igual.
      console.error("orden-confirmada: error cargando puntos", e);
    }
  }
  return <OrdenConfirmadaClient pointsToEarn={pointsToEarn} />;
}
