"use client";

import { useEffect, useState } from "react";
import { FALLBACK_STORE_HOURS, isStoreHoursShape, type StoreHours } from "@/lib/business-hours";

const FETCH_TIMEOUT_MS = 5000;

/**
 * Horario del local para componentes cliente. Arranca con el horario fijo y lo
 * reemplaza por el de la base cuando llega. Si el fetch falla, tarda o responde
 * algo raro, se queda con el fijo. `ready` indica que ya no va a cambiar.
 */
export function useStoreHours(): { hours: StoreHours; ready: boolean } {
  const [state, setState] = useState<{ hours: StoreHours; ready: boolean }>({
    hours: FALLBACK_STORE_HOURS,
    ready: false,
  });

  useEffect(() => {
    let unmounted = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    fetch("/api/business-hours", { cache: "no-store", signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<unknown>) : null))
      .then((data) => {
        if (unmounted) return;
        const hours = (data as { hours?: unknown } | null)?.hours;
        setState({ hours: isStoreHoursShape(hours) ? hours : FALLBACK_STORE_HOURS, ready: true });
      })
      .catch(() => {
        // Error de red o timeout: se queda con el horario fijo.
        if (!unmounted) setState({ hours: FALLBACK_STORE_HOURS, ready: true });
      })
      .finally(() => clearTimeout(timer));

    return () => {
      unmounted = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return state;
}
