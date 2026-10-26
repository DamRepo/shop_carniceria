import { isPointsEnabled } from "@/lib/loyalty-points";
import { MetodoPagoClient } from "./MetodoPagoClient";

// El flag de puntos se lee en el servidor en cada request (no queda fijo en
// el build). Con LOYALTY_POINTS_ENABLED apagado el cliente no pide ni muestra
// nada de puntos.
export const dynamic = "force-dynamic";

export default function MetodoPagoPage() {
  return <MetodoPagoClient pointsEnabled={isPointsEnabled()} />;
}
