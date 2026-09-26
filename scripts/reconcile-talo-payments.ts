#!/usr/bin/env npx
/**
 * reconcile-talo-payments.ts
 *
 * El webhook de Talo (app/api/webhooks/talo/route.ts) responde 200 OK y procesa
 * la confirmación real de forma desacoplada (fire-and-forget) para cumplir el
 * límite de <3s de Talo. Si el proceso Node muere entre ese 200 y que termine
 * de procesar (restart de PM2, deploy, crash), esa confirmación se pierde para
 * siempre — Talo no reintenta porque ya recibió su 200.
 *
 * Este script reconcilia: busca órdenes de Talo Pay que quedaron esperando
 * confirmación hace más de STALE_MINUTES, vuelve a consultar su estado real en
 * Talo y aplica la misma lógica que el webhook (processTaloPayment, en
 * lib/talo-payment-processor.ts — no se duplica lógica de confirmación acá).
 *
 * Es seguro correrlo repetidas veces: processTaloPayment es idempotente
 * (guardas atómicas por updateMany antes de tocar stock).
 *
 * Usage:
 *   npx tsx --require dotenv/config scripts/reconcile-talo-payments.ts
 *
 * Cron (cada 10 minutos, nota el espacio en "* /10" para no cerrar este comentario):
 * @example
 * ```
 * * /10 * * * * cd /path/to/app && npx tsx --require dotenv/config scripts/reconcile-talo-payments.ts >> logs/cron.log 2>&1
 * ```
 */

import * as fs from "fs";
import * as path from "path";
import { prisma } from "../lib/db";
import { processTaloPayment } from "../lib/talo-payment-processor";

const STALE_MINUTES = 15;
const MAX_ORDENES_POR_CORRIDA = 100;
const PAUSA_ENTRE_CONSULTAS_MS = 300;

const LOG_DIR = path.resolve(__dirname, "../logs");
const LOG_FILE = path.join(LOG_DIR, "reconcile-talo-payments.log");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(level: "INFO" | "WARN" | "ERROR", message: string) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n", "utf8");
}

function dormir(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Host de la API de Talo según TALO_ENV — misma lógica que getTaloBaseUrl() en lib/talo.ts. */
function taloHostFromEnv(): string {
  return process.env.TALO_ENV === "production"
    ? "https://api.talo.com.ar"
    : "https://sandbox-api.talo.com.ar";
}

/** host + nombre de la DB, sin user/password ni la URL completa. */
function describeDatabase(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) return "(DATABASE_URL no seteada)";
  try {
    const u = new URL(raw);
    const db = u.pathname.replace(/^\//, "") || "(sin nombre)";
    return `${u.host}/${db}`;
  } catch {
    return "(DATABASE_URL con formato inválido)";
  }
}

async function main() {
  ensureLogDir();

  // Guard de seguridad: dejar asentado contra qué entorno va a correr esta pasada
  // antes de tocar ninguna orden. El script se ejecuta con tsx fuera de Next, así
  // que la carga de .env/.env.local depende del comando (ver package.json
  // "talo:reconcile") — este log permite detectar de un vistazo si por error
  // quedó apuntando a producción durante una prueba de sandbox.
  log(
    "INFO",
    `Entorno: TALO_ENV=${process.env.TALO_ENV ?? "(no seteada)"} | ` +
      `Talo API=${taloHostFromEnv()} | DB=${describeDatabase()}`
  );

  const cutoff = new Date(Date.now() - STALE_MINUTES * 60 * 1000);
  log("INFO", `=== reconcile-talo-payments start (cutoff: órdenes creadas antes de ${cutoff.toISOString()}) ===`);

  const staleOrders = await prisma.order.findMany({
    where: {
      paymentMethod: "TALO_PAY",
      paymentStatus: "PENDING",
      taloPaymentId: { not: null },
      createdAt: { lt: cutoff },
    },
    select: { id: true, orderNumber: true, taloPaymentId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: MAX_ORDENES_POR_CORRIDA,
  });

  log("INFO", `${staleOrders.length} orden(es) de Talo Pay pendientes hace más de ${STALE_MINUTES} min`);

  let confirmed = 0;
  let expired = 0;
  let stillPending = 0;
  let needsReview = 0;
  let errors = 0;

  for (const order of staleOrders) {
    const label = order.orderNumber ?? order.id;

    if (!order.taloPaymentId) continue; // ya filtrado por el where, pero angosta el tipo

    try {
      const result = await processTaloPayment(order.taloPaymentId);

      switch (result.outcome) {
        case "confirmed":
          // El webhook nunca marcó esta orden como pagada y en Talo figura como SUCCESS:
          // evidencia de que el webhook falló o el proceso murió antes de terminar.
          log(
            "WARN",
            `Orden ${label}: estaba PENDING pero Talo dice SUCCESS — el webhook no la había ` +
              `confirmado. La marqué como pagada ahora (revisar por qué falló el webhook).`
          );
          confirmed++;
          break;

        case "expired":
          log("WARN", `Orden ${label}: pago vencido en Talo (EXPIRED) — liberé la reserva de stock.`);
          expired++;
          break;

        case "pending":
          log("INFO", `Orden ${label}: sigue PENDING en Talo (${result.taloStatus}). Nada que hacer todavía.`);
          stillPending++;
          break;

        case "overpaid":
        case "underpaid":
          log("WARN", `Orden ${label}: ${result.outcome.toUpperCase()} — queda para revisión manual de un admin.`);
          needsReview++;
          break;

        case "mismatch":
          log(
            "WARN",
            `Orden ${label}: Talo dice SUCCESS pero el monto no coincide ` +
              `(pagado: ${result.paidAmount}, esperado: ${result.expectedAmount}) — marcada FAILED.`
          );
          needsReview++;
          break;

        case "already_processed":
          log("INFO", `Orden ${label}: ya estaba procesada (otra corrida/el webhook llegó justo antes).`);
          break;

        case "cancelled_order_paid":
          log("ERROR", `Orden ${label}: Talo dice SUCCESS pero la orden está CANCELLED — NO se confirmó. Requiere revisión/reembolso manual.`);
          needsReview++;
          break;

        case "order_not_found":
        case "checkout_session_not_found":
        case "snapshot_invalid":
          log("ERROR", `Orden ${label}: inconsistencia de datos (${result.outcome}) — revisar manualmente.`);
          errors++;
          break;

        case "error":
          log("ERROR", `Orden ${label}: error procesando el pago — ${result.message}`);
          errors++;
          break;
      }
    } catch (err) {
      log(
        "ERROR",
        `Orden ${label}: excepción no controlada — ${err instanceof Error ? err.message : String(err)}`
      );
      errors++;
    }

    await dormir(PAUSA_ENTRE_CONSULTAS_MS);
  }

  log(
    "INFO",
    `=== Done — confirmadas: ${confirmed}, vencidas: ${expired}, siguen pendientes: ${stillPending}, ` +
      `requieren revisión: ${needsReview}, errores: ${errors} ===`
  );

  await prisma.$disconnect();

  if (errors > 0) process.exit(1);
}

main().catch(async (err) => {
  console.error("Fatal error:", err);
  await prisma.$disconnect();
  process.exit(1);
});
