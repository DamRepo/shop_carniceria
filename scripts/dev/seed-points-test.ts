/**
 * Usuario de prueba para el sistema de puntos — SOLO BASE LOCAL.
 *
 * Uso (desde la raíz del repo):
 *   npx tsx --require dotenv/config --require ./scripts/load-env-local.cjs scripts/dev/seed-points-test.ts
 *   … seed-points-test.ts --points=90      deja el lote de prueba en 90 puntos
 *   … seed-points-test.ts --reset          borra puntos, reservas, movimientos y órdenes del usuario
 *
 * Qué deja:
 * - Usuario CUSTOMER puntos-test@example.local con contraseña conocida (se imprime).
 * - Orden previa pagada con bienvenida usada (WelcomeBenefit USED), para que
 *   no le aparezca la bienvenida y la compra siguiente ya sume puntos.
 * - Orden pagada que originó un lote vigente de 200 puntos (o --points=N)
 *   que vence a los 45 días.
 *
 * Solo toca filas de ese usuario. No prende LOYALTY_POINTS_ENABLED: eso va en
 * .env.local a mano.
 */
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const EMAIL = "puntos-test@example.local";
const PASSWORD = "PuntosTest-2026";
const ORDER_PREFIX = "qa-puntos-test-";
const PREV_ORDER_NUMBER = `${ORDER_PREFIX}previa`;
const POINTS_ORDER_NUMBER = `${ORDER_PREFIX}lote`;
const DEFAULT_POINTS = 200;
const LOT_DAYS = 45;
const DAY_MS = 24 * 60 * 60 * 1000;

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

function parseArgs(argv: string[]): { reset: boolean; points: number } {
  let reset = false;
  let points = DEFAULT_POINTS;
  for (const arg of argv) {
    if (arg === "--reset") {
      reset = true;
    } else if (arg.startsWith("--points=")) {
      const n = Number(arg.slice("--points=".length));
      if (!Number.isInteger(n) || n < 0 || n > 100_000) {
        throw new Error(`--points inválido: "${arg}". Tiene que ser un entero entre 0 y 100000.`);
      }
      points = n;
    } else {
      throw new Error(`Argumento desconocido: "${arg}". Usá --points=N o --reset.`);
    }
  }
  return { reset, points };
}

function baseOrder(userId: string, orderNumber: string, subtotal: number) {
  return {
    userId,
    orderNumber,
    customerName: "Puntos Test",
    phone: "0",
    email: EMAIL,
    deliveryMethod: "PICKUP" as const,
    paymentMethod: "CASH" as const,
    paymentStatus: "PAID" as const,
    status: "COMPLETED" as const,
    paidAt: new Date(),
    confirmedAt: new Date(),
    subtotal,
  };
}

/**
 * Borra todo lo del usuario de prueba (no el usuario). Si tiene pedidos hechos
 * desde la tienda que no estén cancelados, aborta: borrarlos dejaría stock
 * descontado o reservado. Hay que cancelarlos antes desde el admin, que
 * devuelve stock y puntos.
 */
async function reset(userId: string) {
  const open = await prisma.order.findMany({
    where: { userId, status: { not: "CANCELLED" }, NOT: { orderNumber: { startsWith: ORDER_PREFIX } } },
    select: { orderNumber: true, status: true, paymentMethod: true },
  });
  if (open.length > 0) {
    const list = open.map((o) => `  - #${o.orderNumber} (${o.paymentMethod}, ${o.status})`).join("\n");
    throw new Error(
      `El usuario de prueba tiene pedidos sin cancelar hechos desde la tienda:\n${list}\n` +
        "Cancelalos desde el admin (devuelve stock y puntos) y volvé a correr --reset."
    );
  }

  const r = await prisma.$transaction(async (tx) => {
    const allocations = await tx.pointsReservationAllocation.deleteMany({ where: { reservation: { userId } } });
    const reservations = await tx.pointsReservation.deleteMany({ where: { userId } });
    const movements = await tx.pointsMovement.deleteMany({ where: { userId } });
    const lots = await tx.pointsLot.deleteMany({ where: { userId } });
    const welcome = await tx.welcomeBenefit.deleteMany({ where: { userId } });
    const sessions = await tx.checkoutSession.deleteMany({ where: { userId } });
    const orders = await tx.order.deleteMany({ where: { userId } });
    return { allocations, reservations, movements, lots, welcome, sessions, orders };
  });
  console.log(
    `Reset: ${r.lots.count} lotes, ${r.reservations.count} reservas (${r.allocations.count} asignaciones), ` +
      `${r.movements.count} movimientos, ${r.orders.count} órdenes, ${r.sessions.count} checkouts, ` +
      `${r.welcome.count} bienvenida.`
  );
}

async function seed(userId: string, points: number) {
  const now = new Date();

  // Orden previa con bienvenida usada: la bienvenida ya no aplica y esta
  // compra (como cualquier compra con bienvenida) no sumó puntos.
  let prev = await prisma.order.findUnique({ where: { orderNumber: PREV_ORDER_NUMBER } });
  if (!prev) {
    prev = await prisma.order.create({
      data: { ...baseOrder(userId, PREV_ORDER_NUMBER, 1_000_000), welcomeDiscount: 100_000, total: 900_000 },
    });
  }
  const welcome = await prisma.welcomeBenefit.findUnique({ where: { userId } });
  if (!welcome) {
    await prisma.welcomeBenefit.create({
      data: { userId, orderId: prev.id, status: "USED", discountCents: 100_000 },
    });
  }

  // Orden pagada que originó el lote de prueba (1 punto cada $100).
  const subtotal = Math.max(points, 1) * 10_000;
  let lotOrder = await prisma.order.findUnique({
    where: { orderNumber: POINTS_ORDER_NUMBER },
    select: { id: true, pointsLot: { select: { id: true, _count: { select: { allocations: true } } } } },
  });
  if (lotOrder?.pointsLot && lotOrder.pointsLot._count.allocations > 0) {
    throw new Error(
      "El lote de prueba ya se usó en algún checkout (tiene reservas). Corré --reset y volvé a sembrar."
    );
  }
  if (!lotOrder) {
    lotOrder = await prisma.order.create({
      data: { ...baseOrder(userId, POINTS_ORDER_NUMBER, subtotal), total: subtotal, pointsEarned: points },
      select: { id: true, pointsLot: { select: { id: true, _count: { select: { allocations: true } } } } },
    });
  } else {
    await prisma.order.update({
      where: { id: lotOrder.id },
      data: { subtotal, total: subtotal, pointsEarned: points },
    });
  }

  const expiresAt = new Date(now.getTime() + LOT_DAYS * DAY_MS);
  if (lotOrder.pointsLot) {
    await prisma.pointsLot.update({
      where: { id: lotOrder.pointsLot.id },
      data: { earned: points, remaining: points, expiresAt, revokedAt: null },
    });
  } else {
    await prisma.pointsLot.create({
      data: { userId, earned: points, remaining: points, expiresAt, sourceOrderId: lotOrder.id },
    });
  }
  // Movimiento EARN del lote (para que aparezca en el historial del perfil).
  await prisma.pointsMovement.upsert({
    where: { orderId_type: { orderId: lotOrder.id, type: "EARN" } },
    update: { points },
    create: { userId, orderId: lotOrder.id, type: "EARN", points },
  });

  const [sum, other] = await Promise.all([
    prisma.pointsLot.aggregate({
      where: { userId, revokedAt: null, expiresAt: { gt: now }, remaining: { gt: 0 } },
      _sum: { remaining: true },
    }),
    prisma.pointsLot.count({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
        remaining: { gt: 0 },
        NOT: { sourceOrderId: lotOrder.id },
      },
    }),
  ]);
  const balance = sum._sum.remaining ?? 0;

  console.log(`Lote de prueba: ${points} puntos, vence el ${expiresAt.toLocaleDateString("es-AR")}.`);
  console.log(`Saldo vigente del usuario: ${balance} puntos.`);
  if (other > 0) {
    console.log(
      `Ojo: hay ${other} lote(s) más, ganados en pruebas de checkout, que suman al saldo. ` +
        "Usá --reset para empezar de cero."
    );
  }
}

async function main() {
  assertLocalDatabase();
  const { reset: doReset, points } = parseArgs(process.argv.slice(2));

  let user = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true, role: true } });

  if (doReset) {
    if (!user) {
      console.log("No existe el usuario de prueba: no hay nada que borrar.");
      return;
    }
    await reset(user.id);
    return;
  }

  // Se reescribe la contraseña en cada corrida para que siempre sea la conocida.
  const password = await bcrypt.hash(PASSWORD, 10);
  if (user) {
    if (user.role !== "CUSTOMER") {
      throw new Error(`El usuario ${EMAIL} existe con rol ${user.role}: no se toca.`);
    }
    await prisma.user.update({ where: { id: user.id }, data: { password } });
  } else {
    user = await prisma.user.create({
      data: { email: EMAIL, password, name: "Puntos Test", role: "CUSTOMER" },
      select: { id: true, role: true },
    });
  }

  await seed(user.id, points);

  console.log("");
  console.log("Usuario de prueba listo:");
  console.log(`  Email:      ${EMAIL}`);
  console.log(`  Contraseña: ${PASSWORD}`);
  console.log("Recordá: los puntos se ven solo con LOYALTY_POINTS_ENABLED=true en tu .env.local.");
}

main()
  .catch((e) => {
    process.stderr.write(`ERROR: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
