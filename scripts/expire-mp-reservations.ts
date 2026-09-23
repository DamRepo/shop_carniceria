#!/usr/bin/env npx
/**
 * expire-mp-reservations.ts
 *
 * Al crear una preferencia de Mercado Pago (app/api/mercadopago/preference) se
 * reserva stock en reservedStock y la CheckoutSession queda con expiresAt = +15 min.
 * Si el cliente nunca paga, MP no manda webhook y esa reserva quedaba tomada
 * para siempre. Este script la libera.
 *
 * Para cada CheckoutSession de MP vencida hace más de GRACE_MINUTES con la
 * reserva todavía tomada:
 *   1. Consulta en MP los pagos con external_reference = orderId.
 *   2. Si hay un pago aprobado o todavía en curso, no toca nada y lo loguea
 *      (lo resuelve el webhook o un admin).
 *   3. Si no hay pago: en una transacción libera la reserva (guard atómico sobre
 *      reservationReleased), marca la sesión EXPIRED y cancela la orden.
 *
 * Es seguro correrlo repetidas veces: el guard reservationReleased=false evita
 * liberar dos veces y la orden solo se cancela si sigue pendiente de pago.
 *
 * Usage:
 *   npx tsx --require dotenv/config scripts/expire-mp-reservations.ts
 *   npx tsx --require dotenv/config scripts/expire-mp-reservations.ts --dry-run
 *
 * Cron (cada 10 minutos, nota el espacio en "* /10" para no cerrar este comentario):
 * @example
 * ```
 * * /10 * * * * cd /path/to/app && npx tsx --require dotenv/config scripts/expire-mp-reservations.ts >> logs/cron.log 2>&1
 * ```
 */

import * as fs from "fs";
import * as path from "path";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/db";
import { toStockQty } from "../lib/stock-units";

const GRACE_MINUTES = 30;
const MAX_SESIONES_POR_CORRIDA = 100;
const PAUSA_ENTRE_CONSULTAS_MS = 300;
const DRY_RUN = process.argv.includes("--dry-run");

// Estados de MP en los que un pago todavía puede terminar aprobado.
const IN_FLIGHT_STATUSES = new Set(["pending", "in_process", "authorized"]);

const LOG_DIR = path.resolve(__dirname, "../logs");
const LOG_FILE = path.join(LOG_DIR, "expire-mp-reservations.log");

type SnapshotItem = {
  productId?: string | null;
  comboId?: string | null;
  quantity: number;
};

type MpPaymentSummary = {
  id: string;
  status: string;
  dateCreated: Date | null;
};

type PaymentCheck =
  | { kind: "none" }
  | { kind: "approved"; payments: MpPaymentSummary[] }
  | { kind: "in_flight"; payments: MpPaymentSummary[] }
  | { kind: "error"; message: string };

type ExpireResult = "expired" | "already_released" | "order_not_cancellable" | "snapshot_invalid";

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

/** Antigüedad legible ("2d 3h", "5h 12m", "40m") desde una fecha hasta ahora. */
function formatAge(from: Date | null): string {
  if (!from) return "antigüedad desconocida";
  const totalMin = Math.max(0, Math.floor((Date.now() - from.getTime()) / 60000));
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function describePayments(payments: MpPaymentSummary[]): string {
  return payments
    .map((p) => `pago ${p.id} ${p.status}, creado hace ${formatAge(p.dateCreated)}`)
    .join("; ");
}

async function checkMpPayments(orderId: string, accessToken: string): Promise<PaymentCheck> {
  const url = new URL("https://api.mercadopago.com/v1/payments/search");
  url.searchParams.set("external_reference", orderId);
  url.searchParams.set("limit", "50");

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch (err) {
    return { kind: "error", message: `error de red: ${err instanceof Error ? err.message : String(err)}` };
  }

  if (!res.ok) return { kind: "error", message: `MP respondió HTTP ${res.status}` };

  const body = (await res.json().catch(() => null)) as
    | { results?: unknown; paging?: { total?: unknown } }
    | null;

  if (!body || !Array.isArray(body.results)) {
    return { kind: "error", message: "respuesta de MP sin results" };
  }

  // Si hay más pagos de los que trae una página, no decidir a ciegas.
  if (typeof body.paging?.total === "number" && body.paging.total > body.results.length) {
    return {
      kind: "error",
      message: `MP devolvió ${body.paging.total} pagos (más de una página) — revisar a mano`,
    };
  }

  const payments: MpPaymentSummary[] = body.results
    .map((r) => r as { id?: unknown; status?: unknown; external_reference?: unknown; date_created?: unknown })
    .filter((p) => p.external_reference === orderId)
    .map((p) => {
      const created = typeof p.date_created === "string" ? new Date(p.date_created) : null;
      return {
        id: String(p.id),
        status: typeof p.status === "string" ? p.status : "unknown",
        dateCreated: created && !Number.isNaN(created.getTime()) ? created : null,
      };
    });

  const approved = payments.filter((p) => p.status === "approved");
  if (approved.length > 0) return { kind: "approved", payments: approved };

  const inFlight = payments.filter((p) => IN_FLIGHT_STATUSES.has(p.status));
  if (inFlight.length > 0) return { kind: "in_flight", payments: inFlight };

  return { kind: "none" };
}

async function expireSession(cs: { id: string; orderId: string; itemsSnapshot: unknown }): Promise<ExpireResult> {
  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Guard atómico: marcar como liberada PRIMERO. Si el webhook, el admin u
      // otra corrida ya la liberó, count=0 y no se toca stock.
      const guard = await tx.checkoutSession.updateMany({
        where: { id: cs.id, reservationReleased: false },
        data: { reservationReleased: true, status: "EXPIRED", mpStatus: "expired_no_payment" },
      });
      if (guard.count === 0) throw new Error("ALREADY_RELEASED");

      // Solo se cancela si sigue pendiente de pago; si no, se revierte todo.
      const cancelled = await tx.order.updateMany({
        where: {
          id: cs.orderId,
          paymentStatus: { not: "PAID" },
          status: { in: ["PENDING_PAYMENT", "PENDING"] },
        },
        data: {
          status: "CANCELLED",
          paymentStatus: "CANCELLED",
          mpStatus: "expired_no_payment",
          cancelledAt: new Date(),
          cancelledBy: "SYSTEM",
          cancellationReason: "Link de Mercado Pago vencido sin pago",
        },
      });
      if (cancelled.count === 0) throw new Error("ORDER_NOT_CANCELLABLE");

      const items = cs.itemsSnapshot as SnapshotItem[];
      if (!Array.isArray(items) || items.length === 0) throw new Error("SNAPSHOT_INVALID");

      for (const it of items) {
        if (it.comboId) {
          const comboQty = Math.round(Number(it.quantity ?? 0));
          if (comboQty <= 0) throw new Error("SNAPSHOT_INVALID");
          await tx.combo.updateMany({
            where: { id: it.comboId, reservedStock: { gte: comboQty } },
            data: { reservedStock: { decrement: comboQty } },
          });
          continue;
        }

        if (!it.productId) throw new Error("SNAPSHOT_INVALID");

        const product = await tx.product.findUnique({
          where: { id: it.productId },
          select: { unitType: true },
        });
        if (!product) continue; // producto borrado: no hay reserva que devolver

        const qty = toStockQty(product.unitType, Number(it.quantity ?? 0));
        await tx.product.updateMany({
          where: { id: it.productId, reservedStock: { gte: qty } },
          data: { reservedStock: { decrement: qty } },
        });
      }
    });
    return "expired";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "ALREADY_RELEASED") return "already_released";
    if (msg === "ORDER_NOT_CANCELLABLE") return "order_not_cancellable";
    if (msg === "SNAPSHOT_INVALID") return "snapshot_invalid";
    throw err;
  }
}

async function main() {
  ensureLogDir();

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    log("ERROR", "Falta MERCADOPAGO_ACCESS_TOKEN — no se puede consultar MP, abortando.");
    await prisma.$disconnect();
    process.exit(1);
  }

  log("INFO", `Entorno: DB=${describeDatabase()}${DRY_RUN ? " | DRY RUN (no se modifica nada)" : ""}`);

  const cutoff = new Date(Date.now() - GRACE_MINUTES * 60 * 1000);
  log("INFO", `=== expire-mp-reservations start (sesiones vencidas antes de ${cutoff.toISOString()}) ===`);

  const sessions = await prisma.checkoutSession.findMany({
    where: {
      status: { in: ["WAITING_MP", "PENDING"] },
      reservationReleased: false,
      expiresAt: { lt: cutoff },
      taloPaymentId: null,
      order: {
        paymentMethod: "MERCADO_PAGO",
        paymentStatus: { not: "PAID" },
        status: { in: ["PENDING_PAYMENT", "PENDING"] },
      },
    },
    select: {
      id: true,
      orderId: true,
      itemsSnapshot: true,
      order: { select: { orderNumber: true } },
    },
    orderBy: { expiresAt: "asc" },
    take: MAX_SESIONES_POR_CORRIDA,
  });

  log("INFO", `${sessions.length} sesión(es) de Mercado Pago vencidas con reserva tomada`);

  let expired = 0;
  let skippedApproved = 0;
  let skippedInFlight = 0;
  let skippedOther = 0;
  let errors = 0;

  for (const cs of sessions) {
    if (!cs.orderId) continue; // ya filtrado por la relación, pero angosta el tipo
    const label = cs.order?.orderNumber ?? cs.orderId;

    try {
      const check = await checkMpPayments(cs.orderId, accessToken);

      switch (check.kind) {
        case "error":
          log("ERROR", `Orden ${label}: no pude consultar MP (${check.message}) — no libero la reserva.`);
          errors++;
          break;

        case "approved":
          log(
            "WARN",
            `Orden ${label}: tiene pago APROBADO en MP (${describePayments(check.payments)}) pero la orden no ` +
              `figura pagada — NO libero la reserva. Revisar webhook / resolver desde el admin.`
          );
          skippedApproved++;
          break;

        case "in_flight":
          log(
            "WARN",
            `Orden ${label}: pago en curso en MP (${describePayments(check.payments)}) — ` +
              `no libero la reserva todavía.`
          );
          skippedInFlight++;
          break;

        case "none": {
          if (DRY_RUN) {
            log("INFO", `[dry-run] Orden ${label}: sin pagos en MP — liberaría la reserva y cancelaría la orden.`);
            expired++;
            break;
          }

          const result = await expireSession({ id: cs.id, orderId: cs.orderId, itemsSnapshot: cs.itemsSnapshot });

          if (result === "expired") {
            log("INFO", `Orden ${label}: sin pagos en MP — reserva liberada, sesión EXPIRED, orden cancelada.`);
            expired++;
          } else if (result === "snapshot_invalid") {
            log("ERROR", `Orden ${label}: itemsSnapshot inválido — no se tocó nada, revisar manualmente.`);
            errors++;
          } else {
            log("INFO", `Orden ${label}: ${result} (el webhook o el admin la resolvió en el medio) — no se tocó nada.`);
            skippedOther++;
          }
          break;
        }
      }
    } catch (err) {
      log("ERROR", `Orden ${label}: excepción no controlada — ${err instanceof Error ? err.message : String(err)}`);
      errors++;
    }

    await dormir(PAUSA_ENTRE_CONSULTAS_MS);
  }

  log(
    "INFO",
    `=== Done${DRY_RUN ? " (dry-run)" : ""} — ${DRY_RUN ? "a expirar" : "expiradas"}: ${expired}, ` +
      `con pago aprobado: ${skippedApproved}, con pago en curso: ${skippedInFlight}, ` +
      `resueltas en el medio: ${skippedOther}, errores: ${errors} ===`
  );

  await prisma.$disconnect();

  if (errors > 0) process.exit(1);
}

main().catch(async (err) => {
  console.error("Fatal error:", err);
  await prisma.$disconnect();
  process.exit(1);
});
