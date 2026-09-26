#!/usr/bin/env npx
/**
 * recalculate-reserved-stock.ts
 *
 * Recalcula Product.reservedStock como la suma de las reservas que el código
 * todavía va a devolver o consumir: OrderItems de órdenes MERCADO_PAGO/TALO_PAY
 * en PENDING/PENDING_PAYMENT, no pagadas, cuya CheckoutSession más reciente
 * sigue con reservationReleased=false.
 *
 * Las sesiones VENCIDAS se cuentan igual: el cron expire-mp-reservations (o el
 * EXPIRED de Talo) les va a restar su reserva más adelante; si se excluyeran
 * acá, esa reserva se descontaría dos veces.
 *
 * Solo escribe Product.reservedStock, y solo con --apply. Nunca toca stock,
 * Order, CheckoutSession ni Combo.
 *
 * Usage:
 *   npx tsx --require dotenv/config scripts/recalculate-reserved-stock.ts            (dry-run)
 *   npx tsx --require dotenv/config scripts/recalculate-reserved-stock.ts --apply
 */

import { prisma } from "../lib/db";
import { toStockQty } from "../lib/stock-units";

const APPLY = process.argv.includes("--apply");
const DRY_RUN_FLAG = process.argv.includes("--dry-run");

type ContributingOrder = {
  orderNumber: string;
  paymentMethod: string;
  status: string;
  expired: boolean;
  items: { name: string; qty: number; unit: string }[];
};

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

function unitLabel(unitType: "PER_UNIT" | "PER_KG") {
  return unitType === "PER_KG" ? "g" : "u";
}

async function main() {
  if (APPLY && DRY_RUN_FLAG) {
    console.error("--apply y --dry-run son excluyentes. Abortando sin tocar nada.");
    process.exit(1);
  }

  const now = new Date();
  console.log(`Entorno: DB=${describeDatabase()} | ${APPLY ? "APPLY (se escribe reservedStock)" : "DRY RUN (no se modifica nada)"}`);
  console.log(`Fecha: ${now.toISOString()}\n`);

  const products = await prisma.product.findMany({
    select: { id: true, name: true, unitType: true, reservedStock: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const orders = await prisma.order.findMany({
    where: {
      paymentMethod: { in: ["MERCADO_PAGO", "TALO_PAY"] },
      status: { in: ["PENDING", "PENDING_PAYMENT"] },
      paymentStatus: { not: "PAID" },
    },
    select: {
      id: true,
      orderNumber: true,
      paymentMethod: true,
      status: true,
      items: { select: { productId: true, comboId: true, quantity: true } },
      checkoutSessions: {
        select: { id: true, reservationReleased: true, expiresAt: true },
        orderBy: { id: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const expected = new Map<string, number>();
  const contributing: ContributingOrder[] = [];
  const anomalies: string[] = [];

  for (const order of orders) {
    const latest = order.checkoutSessions[0];
    if (!latest || latest.reservationReleased) continue;

    const unreleased = order.checkoutSessions.filter((cs) => !cs.reservationReleased);
    if (unreleased.length > 1) {
      anomalies.push(
        `Orden ${order.orderNumber}: ${unreleased.length} sesiones sin liberar (se cuenta solo la más reciente)`
      );
    }

    const entry: ContributingOrder = {
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      status: order.status,
      expired: latest.expiresAt !== null && latest.expiresAt < now,
      items: [],
    };

    for (const it of order.items) {
      if (it.comboId || !it.productId) continue; // combos reservan en Combo.reservedStock

      const product = productById.get(it.productId);
      if (!product) {
        anomalies.push(`Orden ${order.orderNumber}: producto ${it.productId} no existe`);
        continue;
      }

      let qty: number;
      try {
        qty = toStockQty(product.unitType, Number(it.quantity));
      } catch {
        anomalies.push(`Orden ${order.orderNumber}: cantidad inválida (${it.quantity}) en ${product.name}`);
        continue;
      }

      expected.set(product.id, (expected.get(product.id) ?? 0) + qty);
      entry.items.push({ name: product.name, qty, unit: unitLabel(product.unitType) });
    }

    contributing.push(entry);
  }

  // Informativo: sesiones sin liberar en órdenes que ya no deberían tener reserva.
  const staleSessions = await prisma.checkoutSession.findMany({
    where: {
      reservationReleased: false,
      order: { OR: [{ status: "CANCELLED" }, { paymentStatus: "PAID" }] },
    },
    select: { id: true, order: { select: { orderNumber: true, status: true, paymentStatus: true } } },
  });
  for (const cs of staleSessions) {
    anomalies.push(
      `Orden ${cs.order?.orderNumber ?? "?"} (${cs.order?.status}/${cs.order?.paymentStatus}): sesión ${cs.id} sin liberar — no se cuenta`
    );
  }

  const diffs = products
    .map((p) => {
      const correct = expected.get(p.id) ?? 0;
      return {
        id: p.id,
        producto: p.name,
        unidad: unitLabel(p.unitType),
        actual: p.reservedStock,
        correcto: correct,
        diferencia: correct - p.reservedStock,
      };
    })
    .filter((d) => d.diferencia !== 0)
    .sort((a, b) => a.producto.localeCompare(b.producto));

  console.log(`=== Productos con reservedStock distinto al recalculado: ${diffs.length} de ${products.length} ===`);
  if (diffs.length > 0) {
    console.table(
      diffs.map(({ producto, unidad, actual, correcto, diferencia }) => ({
        producto,
        unidad,
        actual,
        correcto,
        diferencia,
      }))
    );
  }

  console.log(`\n=== Órdenes que aportan reserva vigente: ${contributing.length} ===`);
  for (const o of contributing) {
    const items = o.items.map((i) => `${i.name} ${i.qty}${i.unit}`).join(", ") || "(solo combos)";
    console.log(
      `- ${o.orderNumber} | ${o.paymentMethod} | ${o.status}${o.expired ? " | VENCIDA (la libera el cron/webhook)" : ""} | ${items}`
    );
  }

  console.log(`\n=== Anomalías: ${anomalies.length} ===`);
  for (const a of anomalies) console.log(`- ${a}`);

  if (!APPLY) {
    console.log("\nDRY RUN: no se escribió nada. Para aplicar, correr con --apply.");
    return;
  }

  let applied = 0;
  let skipped = 0;
  for (const d of diffs) {
    // Lock optimista: si un checkout real cambió reservedStock desde la lectura, no se pisa.
    const res = await prisma.product.updateMany({
      where: { id: d.id, reservedStock: d.actual },
      data: { reservedStock: d.correcto },
    });
    if (res.count === 1) {
      applied++;
    } else {
      skipped++;
      console.warn(`- ${d.producto}: reservedStock cambió durante la corrida, no se aplicó (volver a correr)`);
    }
  }

  console.log(`\nAPPLY: ${applied} producto(s) corregido(s), ${skipped} salteado(s).`);
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
