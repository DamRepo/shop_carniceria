/**
 * QA de concurrencia de lib/mp-payment-processor.ts — SOLO BASE LOCAL.
 *
 * Uso:
 *   npx tsx --conditions=react-server --require dotenv/config scripts/qa-mp-race.ts
 *
 * Prueba 1 (race): N órdenes nuevas; por cada una se lanzan en paralelo un
 * pago "approved" y uno "rejected" con processMpPayment. Resultados válidos:
 *   A) ganó el aprobado → orden PAID+CONFIRMED, stock descontado UNA vez.
 *   B) ganó el rechazado → orden CANCELLED+FAILED, stock intacto, reserva
 *      liberada una vez, el aprobado devuelve cancelledOrderPaid.
 * Cualquier otro estado final es una anomalía.
 *
 * Prueba 2 (falla técnica): se bloquea la fila de la orden desde otra
 * transacción más tiempo que el timeout de Prisma, para que la transacción de
 * la rama "rejected" falle de verdad. Se espera que processMpPayment TIRE el
 * error (antes devolvía ok: true) y que la orden no cambie.
 *
 * Crea sus propios datos con prefijo qa-race-* y los borra al terminar.
 */
import { prisma } from "@/lib/db";
import { processMpPayment, type MpPayment } from "@/lib/mp-payment-processor";

const RUNS = 50;
const QTY = 2; // unidades por orden (PER_UNIT)
const UNIT_PRICE = 1000; // centavos
const INITIAL_STOCK = 10;
const LOCK_HOLD_MS = 7000; // > timeout default de la transacción interactiva de Prisma (5s)

// --- Guard: nunca contra una base que no sea local ------------------------
function assertLocalDatabase() {
  const raw = process.env.DATABASE_URL ?? "";
  let host = "";
  try {
    host = new URL(raw).hostname;
  } catch {
    // host queda vacío
  }
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(`Abortado: DATABASE_URL no apunta a una base local (host="${host}")`);
  }
}

// Sin Telegram: el camino aprobado manda un mensaje por orden.
delete process.env.TELEGRAM_BOT_TOKEN;
delete process.env.TELEGRAM_CHAT_ID;

// --- Captura de logs del procesador ----------------------------------------
let captured: string[] = [];
const original = { log: console.log, warn: console.warn, error: console.error };
function capture() {
  captured = [];
  const push = (...args: unknown[]) => {
    captured.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
  };
  console.log = push;
  console.warn = push;
  console.error = push;
}
function release(): string[] {
  console.log = original.log;
  console.warn = original.warn;
  console.error = original.error;
  return captured;
}
const out = (...args: unknown[]) => original.log(...args);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const tag = `qa-race-${Date.now()}`;
const created = { orderIds: [] as string[], csIds: [] as string[], productIds: [] as string[], categoryId: "" };

async function createFixture(i: number) {
  const product = await prisma.product.create({
    data: {
      name: `${tag} producto ${i}`,
      slug: `${tag}-p${i}`,
      unitType: "PER_UNIT",
      price: UNIT_PRICE,
      stock: INITIAL_STOCK,
      reservedStock: QTY, // la reserva que hace /api/mercadopago/preference
      categoryId: created.categoryId,
    },
  });
  created.productIds.push(product.id);

  const total = QTY * UNIT_PRICE;
  const order = await prisma.order.create({
    data: {
      customerName: "QA Race",
      phone: "0000000000",
      deliveryMethod: "PICKUP",
      paymentMethod: "MERCADO_PAGO",
      subtotal: total,
      total,
      items: {
        create: [{ productId: product.id, quantity: QTY, unitPrice: UNIT_PRICE, lineTotal: total }],
      },
    },
  });
  created.orderIds.push(order.id);

  const cs = await prisma.checkoutSession.create({
    data: {
      customerName: "QA Race",
      phone: "0000000000",
      deliveryMethod: "PICKUP",
      itemsSnapshot: [{ productId: product.id, quantity: QTY, unitPrice: UNIT_PRICE, lineTotal: total }],
      subtotal: total,
      deliveryCost: 0,
      total,
      orderId: order.id,
    },
  });
  created.csIds.push(cs.id);

  return { order, product, cs, total };
}

function fakePayment(id: string, status: "approved" | "rejected", orderId: string, total: number): MpPayment {
  return {
    id,
    status,
    status_detail: status === "approved" ? "accredited" : "cc_rejected_other_reason",
    external_reference: orderId,
    transaction_amount: total / 100,
    currency_id: "ARS",
  };
}

type RunOutcome =
  | "approved_won_guard" // rechazado entró a su tx y el guard lo frenó ("orden ya pagada por otro camino")
  | "approved_won_early" // rechazado leyó la orden ya PAID y salió antes de abrir la tx
  | "rejected_won"
  | "ANOMALY";

async function raceTest() {
  const tally: Record<RunOutcome, number> = {
    approved_won_guard: 0,
    approved_won_early: 0,
    rejected_won: 0,
    ANOMALY: 0,
  };
  let doubleDecrement = 0;
  const anomalies: string[] = [];

  for (let i = 1; i <= RUNS; i++) {
    const { order, product, total } = await createFixture(i);
    const approved = fakePayment(`${tag}-A${i}`, "approved", order.id, total);
    const rejected = fakePayment(`${tag}-R${i}`, "rejected", order.id, total);

    // Alternar quién arranca primero para variar los interleavings.
    capture();
    const calls =
      i % 2 === 0
        ? [processMpPayment(String(approved.id), approved), processMpPayment(String(rejected.id), rejected)]
        : [processMpPayment(String(rejected.id), rejected), processMpPayment(String(approved.id), approved)];

    const settled = await Promise.allSettled(calls);
    await sleep(50); // dejar que termine el Telegram fire-and-forget antes de soltar la captura
    const logs = release();

    const [rA, rR] = i % 2 === 0 ? settled : [settled[1], settled[0]];

    const fo = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    const fp = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    const decremented = INITIAL_STOCK - fp.stock;
    if (decremented > QTY) doubleDecrement++;

    const guardLog = logs.some((l) => l.includes("orden ya pagada por otro camino, no se pisa"));
    const fmt = (r: PromiseSettledResult<unknown>) =>
      r.status === "fulfilled" ? JSON.stringify(r.value) : `THROW ${String(r.reason)}`;

    let outcome: RunOutcome = "ANOMALY";
    const bothFulfilled = rA.status === "fulfilled" && rR.status === "fulfilled";

    if (
      bothFulfilled &&
      fo.paymentStatus === "PAID" &&
      fo.status === "CONFIRMED" &&
      fp.stock === INITIAL_STOCK - QTY &&
      fp.reservedStock === 0 &&
      fo.mpPaymentId === approved.id
    ) {
      outcome = guardLog ? "approved_won_guard" : "approved_won_early";
    } else if (
      bothFulfilled &&
      fo.paymentStatus === "FAILED" &&
      fo.status === "CANCELLED" &&
      fp.stock === INITIAL_STOCK &&
      fp.reservedStock === 0 &&
      rA.status === "fulfilled" &&
      JSON.stringify(rA.value).includes("cancelledOrderPaid")
    ) {
      outcome = "rejected_won";
    }

    tally[outcome]++;
    if (outcome === "ANOMALY") {
      anomalies.push(
        `#${i}: order=${fo.status}/${fo.paymentStatus} mpPaymentId=${fo.mpPaymentId} ` +
          `stock=${fp.stock} reserved=${fp.reservedStock} | approved→${fmt(rA)} | rejected→${fmt(rR)}`
      );
    }

    out(
      `#${String(i).padStart(2, "0")} ${outcome.padEnd(20)} order=${fo.status}/${fo.paymentStatus} ` +
        `stock ${INITIAL_STOCK}→${fp.stock} reserved ${QTY}→${fp.reservedStock}`
    );
  }

  out("\n=== Prueba 1: race approved vs rejected ===");
  out(`Corridas: ${RUNS}`);
  out(`Ganó el aprobado (rechazado frenado por el guard nuevo): ${tally.approved_won_guard}`);
  out(`Ganó el aprobado (rechazado salió por el chequeo temprano de PAID): ${tally.approved_won_early}`);
  out(`Ganó el rechazado (orden CANCELLED, aprobado → cancelledOrderPaid): ${tally.rejected_won}`);
  out(`Anomalías: ${tally.ANOMALY}`);
  out(`Stock descontado más de una vez: ${doubleDecrement}`);
  for (const a of anomalies) out("  " + a);

  return tally.ANOMALY === 0 && doubleDecrement === 0;
}

async function dbFailureTest() {
  out("\n=== Prueba 2: falla técnica real de la transacción (rama rejected) ===");
  const { order, total } = await createFixture(0);
  const rejected = fakePayment(`${tag}-R0`, "rejected", order.id, total);

  // Otra conexión toma el lock de la fila y lo retiene más que el timeout de Prisma.
  const holder = prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;
      await sleep(LOCK_HOLD_MS);
    },
    { timeout: LOCK_HOLD_MS + 10_000 }
  );
  await sleep(300); // asegurar que el lock ya está tomado

  capture();
  let threw: unknown = null;
  let returned: unknown = null;
  try {
    returned = await processMpPayment(String(rejected.id), rejected);
  } catch (err) {
    threw = err;
  }
  const logs = release();
  await holder;

  const fo = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  const cs = await prisma.checkoutSession.findFirstOrThrow({ where: { orderId: order.id } });
  const fp = await prisma.product.findFirstOrThrow({ where: { slug: `${tag}-p0` } });

  out(`processMpPayment ${threw ? "TIRÓ el error" : `DEVOLVIÓ ${JSON.stringify(returned)}`}`);
  if (threw) out(`  error: ${threw instanceof Error ? threw.message.split("\n").slice(-2).join(" ").trim() : String(threw)}`);
  out(`  log del procesador: ${logs.find((l) => l.includes("tx error")) ?? "(sin log de tx error)"}`);
  out(
    `  estado final: order=${fo.status}/${fo.paymentStatus} cs=${cs.status} reservationReleased=${cs.reservationReleased} ` +
      `reserved=${fp.reservedStock}`
  );

  const unchanged =
    fo.status === "PENDING_PAYMENT" &&
    fo.paymentStatus === "PENDING" &&
    cs.status === "WAITING_MP" &&
    cs.reservationReleased === false &&
    fp.reservedStock === QTY;
  out(`  orden/sesión/reserva sin cambios (rollback completo): ${unchanged ? "sí" : "NO"}`);

  return Boolean(threw) && unchanged;
}

async function cleanup() {
  await prisma.order.deleteMany({ where: { id: { in: created.orderIds } } }); // items en cascada
  await prisma.checkoutSession.deleteMany({ where: { id: { in: created.csIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  if (created.categoryId) await prisma.category.delete({ where: { id: created.categoryId } });
}

async function main() {
  assertLocalDatabase();

  const category = await prisma.category.create({ data: { name: `${tag} categoría`, slug: `${tag}-cat` } });
  created.categoryId = category.id;

  let ok = false;
  try {
    const raceOk = await raceTest();
    const failOk = await dbFailureTest();
    ok = raceOk && failOk;
    out(`\nRESULTADO: ${ok ? "OK" : "FALLÓ"} (race: ${raceOk ? "OK" : "FALLÓ"}, falla técnica: ${failOk ? "OK" : "FALLÓ"})`);
  } finally {
    release();
    await cleanup();
    await prisma.$disconnect();
  }

  if (!ok) process.exit(1);
}

main().catch((err) => {
  release();
  original.error(err);
  process.exit(1);
});
