import { isLoyaltyEnabled } from "@/lib/loyalty";
import { WelcomeBannerClient } from "@/components/welcome-banner-client";

// Server Component: con LOYALTY_ENABLED apagado no renderiza nada ni manda JS
// al navegador. El flag se lee acá, en el servidor; nunca se expone al cliente.
// La versión (invitado / cliente elegible) la decide /api/loyalty/welcome-banner
// para que el home siga cacheado (revalidate) sin leer la sesión.
export function WelcomeBanner() {
  if (!isLoyaltyEnabled()) return null;
  return <WelcomeBannerClient />;
}
