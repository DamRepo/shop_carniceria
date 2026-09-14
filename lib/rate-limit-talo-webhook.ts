/**
 * Rate limit en memoria para el webhook de Talo. Válido porque el VPS corre
 * una sola instancia PM2 (no serverless, no múltiples réplicas) — si eso
 * cambia, esto necesita moverse a Redis o similar.
 */
const intentosPorPaymentId = new Map<string, { conteo: number; ventanaInicio: number }>();
const VENTANA_MS = 60 * 1000; // 1 minuto
const MAX_INTENTOS_POR_VENTANA = 5;

export function debeProcesarWebhookTalo(paymentId: string): boolean {
  const ahora = Date.now();
  const entrada = intentosPorPaymentId.get(paymentId);

  if (!entrada || ahora - entrada.ventanaInicio > VENTANA_MS) {
    intentosPorPaymentId.set(paymentId, { conteo: 1, ventanaInicio: ahora });
    return true;
  }

  if (entrada.conteo >= MAX_INTENTOS_POR_VENTANA) {
    return false;
  }

  entrada.conteo += 1;
  return true;
}
