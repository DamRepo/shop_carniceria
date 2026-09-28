import "server-only";
import { prisma } from "@/lib/db";
import { FALLBACK_STORE_HOURS, parseStoreHours, type StoreHours } from "@/lib/business-hours";

const CACHE_TTL_MS = 5 * 60 * 1000;
// Si hubo que usar el respaldo, se reintenta la base antes.
const FALLBACK_TTL_MS = 30 * 1000;

let cache: { hours: StoreHours; expiresAt: number } | null = null;

/**
 * Horario del local desde BusinessHours, cacheado en memoria.
 * Nunca tira: si la tabla está vacía, es inválida o la consulta falla,
 * devuelve FALLBACK_STORE_HOURS (el checkout no puede romperse por esto).
 */
export async function getStoreHours(): Promise<StoreHours> {
  if (cache && cache.expiresAt > Date.now()) return cache.hours;

  let hours: StoreHours | null = null;
  try {
    const rows = await prisma.businessHours.findMany();
    hours = parseStoreHours(rows);
    if (!hours) {
      console.error("[business-hours] Horario en base vacío o inválido; se usa el horario fijo", {
        rows: rows.length,
      });
    }
  } catch (err) {
    console.error("[business-hours] Error leyendo el horario; se usa el horario fijo:", err);
  }

  cache = hours
    ? { hours, expiresAt: Date.now() + CACHE_TTL_MS }
    : { hours: FALLBACK_STORE_HOURS, expiresAt: Date.now() + FALLBACK_TTL_MS };
  return cache.hours;
}

/** Tras editar el horario desde el admin (solo afecta a este proceso). */
export function invalidateStoreHoursCache() {
  cache = null;
}
