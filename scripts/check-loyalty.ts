/**
 * Verificación de lib/loyalty.ts (bienvenida 10%) — SOLO BASE LOCAL.
 *
 * Uso:
 *   npx tsx --conditions=react-server --require dotenv/config scripts/check-loyalty.ts
 *
 * Crea usuarios/órdenes con prefijo qa-loyalty-* y los borra al terminar.
 */
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  computeWelcomeDiscountCents,
  computeWelcomeQuote,
  releaseWelcome,
  reserveWelcome,
  settleWelcomeOnPaid,
  WelcomeBenefitError,
} from "@/lib/loyalty";

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

const PREFIX = `qa-loyalty-${Date.now()}`;
const created = { userIds: [] as string[], orderIds: [] as string[] };

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (!ok) failures++;
  process.stdout.write(`${ok ? "OK  " : "FAIL"} ${name}${ok ? "" : ` → ${JSON.stringify(detail)}`}\n`);
}

function setFlag(on: boolean) {
  process.env.LOYALTY_ENABLED = on ? "true" : "false";
}

async function createUser(tag: string, role: UserRole = "CUSTOMER") {
  const u = await prisma.user.create({
    data: { email: `${PREFIX}-${tag}@example.test`, password: "x", role },
  });
  created.userIds.push(u.id);
  return u;
}

async function createOrder(data: {
  userId?: string | null;
  email?: string | null;
  status?: "PENDING_PAYMENT" | "CANCELLED";
}) {
  const o = await prisma.order.create({
    data: {
      userId: data.userId ?? null,
      email: data.email ?? null,
      status: data.status ?? "PENDING_PAYMENT",
      customerName: "QA Loyalty",
      phone: "0",
      deliveryMethod: "PICKUP",
      paymentMethod: "CASH",
      subtotal: 100000,
      total: 100000,
    },
  });
  created.orderIds.push(o.id);
  return o;
}

async function main() {
  assertLocalDatabase();
  setFlag(true);

  // 1) Redondeo
  check("redondeo $1.999,99 → $199", computeWelcomeDiscountCents(199999) === 19900, computeWelcomeDiscountCents(199999));
  check("redondeo $50 → $5", computeWelcomeDiscountCents(5000) === 500, computeWelcomeDiscountCents(5000));
  check("redondeo $0 → $0", computeWelcomeDiscountCents(0) === 0, computeWelcomeDiscountCents(0));

  const fresh = await createUser("fresh");
  const q1 = await computeWelcomeQuote({ userId: fresh.id, subtotalCents: 199999 });
  check("quote usuario nuevo $1.999,99 → elegible 19900", q1.eligible && q1.discountCents === 19900, q1);
  const q0 = await computeWelcomeQuote({ userId: fresh.id, subtotalCents: 0 });
  check("quote $0 → no elegible ZERO_DISCOUNT", !q0.eligible && q0.reason === "ZERO_DISCOUNT", q0);

  // 2) Flag apagado
  setFlag(false);
  const qOff = await computeWelcomeQuote({ userId: fresh.id, subtotalCents: 199999 });
  check("flag off → quote no elegible, 0", !qOff.eligible && qOff.discountCents === 0 && qOff.reason === "DISABLED", qOff);
  const offOrder = await createOrder({ userId: fresh.id });
  let offErr: unknown = null;
  try {
    await reserveWelcome(null, { userId: fresh.id, orderId: offOrder.id, discountCents: 500 });
  } catch (e) {
    offErr = e;
  }
  check("flag off → reserveWelcome rechaza", offErr instanceof WelcomeBenefitError && offErr.code === "DISABLED", String(offErr));
  setFlag(true);

  // 3) Elegibilidad: invitado, rol, órdenes previas
  const qGuest = await computeWelcomeQuote({ userId: null, subtotalCents: 5000 });
  check("invitado → NOT_LOGGED_IN", !qGuest.eligible && qGuest.reason === "NOT_LOGGED_IN", qGuest);

  const admin = await createUser("admin", "ADMIN");
  const qAdmin = await computeWelcomeQuote({ userId: admin.id, subtotalCents: 5000 });
  check("ADMIN → NOT_CUSTOMER", !qAdmin.eligible && qAdmin.reason === "NOT_CUSTOMER", qAdmin);

  const withOrder = await createUser("with-order");
  await createOrder({ userId: withOrder.id });
  const qPrev = await computeWelcomeQuote({ userId: withOrder.id, subtotalCents: 5000 });
  check("orden previa por userId → PREVIOUS_ORDER", !qPrev.eligible && qPrev.reason === "PREVIOUS_ORDER", qPrev);

  const guestBuyer = await createUser("guest-buyer");
  await createOrder({ userId: null, email: `  ${guestBuyer.email.toUpperCase()} ` });
  const qGuestPrev = await computeWelcomeQuote({ userId: guestBuyer.id, subtotalCents: 5000 });
  check("orden previa como invitado (email con mayúsculas/espacios) → PREVIOUS_ORDER", !qGuestPrev.eligible && qGuestPrev.reason === "PREVIOUS_ORDER", qGuestPrev);

  const otherEmail = `${PREFIX}-otro-mail@example.test`;
  const checkoutMailUser = await createUser("checkout-mail");
  await createOrder({ userId: null, email: otherEmail });
  const qCheckoutMail = await computeWelcomeQuote({ userId: checkoutMailUser.id, checkoutEmail: otherEmail, subtotalCents: 5000 });
  check("orden previa con el email del checkout → PREVIOUS_ORDER", !qCheckoutMail.eligible && qCheckoutMail.reason === "PREVIOUS_ORDER", qCheckoutMail);

  const cancelledOnly = await createUser("cancelled-only");
  await createOrder({ userId: cancelledOnly.id, status: "CANCELLED" });
  const qCancelled = await computeWelcomeQuote({ userId: cancelledOnly.id, subtotalCents: 5000 });
  check("solo órdenes canceladas → elegible 500", qCancelled.eligible && qCancelled.discountCents === 500, qCancelled);

  // 4) Doble reserva (unique userId)
  const buyer = await createUser("buyer");
  const orderA = await createOrder({ userId: buyer.id });
  const orderB = await createOrder({ userId: buyer.id });
  await prisma.$transaction((tx) => reserveWelcome(tx, { userId: buyer.id, orderId: orderA.id, discountCents: 500 }));
  const rowA = await prisma.welcomeBenefit.findUnique({ where: { userId: buyer.id } });
  check("reserva crea fila RESERVED con orderId", rowA?.status === "RESERVED" && rowA.orderId === orderA.id, rowA);

  let dupErr: unknown = null;
  try {
    await prisma.$transaction((tx) => reserveWelcome(tx, { userId: buyer.id, orderId: orderB.id, discountCents: 500 }));
  } catch (e) {
    dupErr = e;
  }
  check("doble reserva → WelcomeBenefitError ALREADY_CLAIMED", dupErr instanceof WelcomeBenefitError && dupErr.code === "ALREADY_CLAIMED", String(dupErr));

  const qReserved = await computeWelcomeQuote({ userId: buyer.id, subtotalCents: 5000 });
  check("con reserva activa → ALREADY_CLAIMED", !qReserved.eligible && qReserved.reason === "ALREADY_CLAIMED", qReserved);

  // 5) Release idempotente (con flag apagado), luego se puede reintentar
  setFlag(false);
  const rel1 = await releaseWelcome(null, orderA.id);
  const rel2 = await releaseWelcome(null, orderA.id);
  const afterRelease = await prisma.welcomeBenefit.count({ where: { userId: buyer.id } });
  check("release borra la reserva (flag off), 2da vez no-op", rel1 === 1 && rel2 === 0 && afterRelease === 0, { rel1, rel2, afterRelease });
  setFlag(true);

  await prisma.$transaction((tx) => reserveWelcome(tx, { userId: buyer.id, orderId: orderB.id, discountCents: 500 }));
  check("tras release se puede reservar de nuevo", (await prisma.welcomeBenefit.count({ where: { orderId: orderB.id } })) === 1);

  // 6) Settle idempotente (con flag apagado); release no toca USED
  setFlag(false);
  const s1 = await prisma.$transaction((tx) => settleWelcomeOnPaid(tx, orderB.id));
  const s2 = await settleWelcomeOnPaid(null, orderB.id);
  const sNone = await settleWelcomeOnPaid(null, orderA.id);
  const rowB = await prisma.welcomeBenefit.findUnique({ where: { orderId: orderB.id } });
  check("settle RESERVED→USED (flag off), 2da vez y orden sin fila no fallan", s1 === 1 && s2 === 0 && sNone === 0 && rowB?.status === "USED", { s1, s2, sNone, status: rowB?.status });
  const relUsed = await releaseWelcome(null, orderB.id);
  const stillUsed = await prisma.welcomeBenefit.findUnique({ where: { orderId: orderB.id } });
  check("release no borra una fila USED", relUsed === 0 && stillUsed?.status === "USED", { relUsed, status: stillUsed?.status });
  setFlag(true);
}

async function cleanup() {
  await prisma.welcomeBenefit.deleteMany({ where: { userId: { in: created.userIds } } });
  await prisma.order.deleteMany({ where: { id: { in: created.orderIds } } });
  await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
}

main()
  .catch((e) => {
    failures++;
    process.stderr.write(`ERROR: ${e instanceof Error ? e.message : String(e)}\n`);
  })
  .finally(async () => {
    if (created.userIds.length || created.orderIds.length) {
      await cleanup().catch((e) => process.stderr.write(`ERROR en cleanup: ${String(e)}\n`));
      const left = await prisma.user.count({ where: { email: { startsWith: PREFIX } } });
      process.stdout.write(`cleanup: usuarios qa restantes = ${left}\n`);
    }
    await prisma.$disconnect();
    process.stdout.write(failures === 0 ? "\nTODO OK\n" : `\n${failures} FALLA(S)\n`);
    process.exit(failures === 0 ? 0 : 1);
  });
