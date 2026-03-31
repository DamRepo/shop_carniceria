type Entry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Entry>();

// Umbral para disparar limpieza. En producción con muchas IPs únicas el Map
// crecería indefinidamente sin esto.
const CLEANUP_THRESHOLD = 5000;

function purgeExpired(now: number) {
  for (const [k, v] of store) {
    if (v.resetAt <= now) store.delete(k);
  }
}

export function rateLimit(key: string, limit = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();

  // Limpieza de entradas expiradas cuando el store supera el umbral.
  if (store.size >= CLEANUP_THRESHOLD) {
    purgeExpired(now);
  }

  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count += 1;
  store.set(key, entry);

  return { success: true, remaining: Math.max(0, limit - entry.count) };
}