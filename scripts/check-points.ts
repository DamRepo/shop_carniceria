/**
 * Verificación de lib/loyalty-points.ts (sistema de puntos) — SOLO BASE LOCAL.
 *
 * Uso:
 *   npx tsx --conditions=react-server --require dotenv/config scripts/check-points.ts
 *
 * Crea usuarios/órdenes/lotes con prefijo qa-points-* y los borra al terminar.
 */
import type { PaymentMethod, PaymentStatus, OrderStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  awardPointsOnPaid,
  computeMaxPointsQuote,
  computePointsEarned,
  computePointsQuote,
  getPointsBalance,
  isPointsEnabled,
  maxRedeemablePoints,
  PointsError,
  POINTS_CHANGED_MESSAGE,
  pointsErrorBody,
  pointsRejectionMessage,
  pointsToCents,
  releasePoints,
  reservePoints,
  resolvePointsRedemption,
  revokePointsOnPaidCancel,
  settlePointsOnPaid,
} from "@/lib/loyalty-points";

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

const PREFIX = `qa-points-${Date.now()}`;
const created = { userIds: [] as string[], orderIds: [] as string[] };
const DAY_MS = 24 * 60 * 60 * 1000;

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (!ok) failures++;
  process.stdout.write(`${ok ? "OK  " : "FAIL"} ${name}${ok ? "" : ` → ${JSON.stringify(detail)}`}\n`);
}

function setFlag(on: boolean) {
  process.env.LOYALTY_POINTS_ENABLED = on ? "true" : "false";
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
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  status?: OrderStatus;
  subtotal?: number;
  deliveryCost?: number;
  welcomeDiscount?: number | null;
  pointsDiscount?: number | null;
}) {
  const subtotal = data.subtotal ?? 1_000_000;
  const deliveryCost = data.deliveryCost ?? 0;
  const o = await prisma.order.create({
    data: {
      userId: data.userId ?? null,
      status: data.status ?? "PENDING_PAYMENT",
      paymentStatus: data.paymentStatus ?? "PENDING",
      customerName: "QA Points",
      phone: "0",
      deliveryMethod: "PICKUP",
      paymentMethod: data.paymentMethod ?? "CASH",
      subtotal,
      deliveryCost,
      total: subtotal + deliveryCost - (data.welcomeDiscount ?? 0) - (data.pointsDiscount ?? 0),
      welcomeDiscount: data.welcomeDiscount ?? null,
      pointsDiscount: data.pointsDiscount ?? null,
    },
  });
  created.orderIds.push(o.id);
  return o;
}

function paidOrder(userId: string | null, extra: Parameters<typeof createOrder>[0] = {}) {
  return createOrder({ userId, paymentStatus: "PAID", status: "CONFIRMED", ...extra });
}

async function createLot(userId: string, points: number, daysToExpire: number, revoked = false) {
  return prisma.pointsLot.create({
    data: {
      userId,
      earned: points,
      remaining: points,
      expiresAt: new Date(Date.now() + daysToExpire * DAY_MS),
      revokedAt: revoked ? new Date() : null,
    },
  });
}

async function reserve(userId: string, orderId: string, points: number) {
  await prisma.$transaction((tx) =>
    reservePoints(tx, { userId, orderId, points, discountCents: pointsToCents(points) })
  );
}

async function errorOf(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    await fn();
    return null;
  } catch (e) {
    return e;
  }
}

function isPointsError(e: unknown, code: PointsError["code"]): boolean {
  return e instanceof PointsError && e.code === code;
}

async function balanceOf(userId: string) {
  return (await getPointsBalance(userId)).available;
}

async function main() {
  assertLocalDatabase();

  // 0) Flag apagado por defecto
  delete process.env.LOYALTY_POINTS_ENABLED;
  check("flag sin definir → apagado", isPointsEnabled() === false);
  setFlag(true);

  // 1) Cálculo de puntos ganados (floor)
  check("ganados $99,99 → 0", computePointsEarned(9999) === 0, computePointsEarned(9999));
  check("ganados $100 → 1", computePointsEarned(10000) === 1, computePointsEarned(10000));
  check("ganados $9.999,99 → 99", computePointsEarned(999999) === 99, computePointsEarned(999999));
  check("ganados $0 / negativo → 0", computePointsEarned(0) === 0 && computePointsEarned(-500) === 0);
  check("10 puntos = $50 (5000 centavos)", pointsToCents(10) === 5000, pointsToCents(10));

  // 2) Máximo canjeable: mínimo 100, tope 50%, bloques de 10
  check("max: saldo 99 → 0 (mínimo 100)", maxRedeemablePoints(99, 1_000_000) === 0);
  check("max: saldo 100 → 100", maxRedeemablePoints(100, 1_000_000) === 100);
  check("max: saldo 135 → 130 (bloques de 10)", maxRedeemablePoints(135, 1_000_000) === 130);
  check("max: subtotal $300 → 30 (50% = $150)", maxRedeemablePoints(1000, 30_000) === 30, maxRedeemablePoints(1000, 30_000));
  check("max: subtotal $310 → 30 (31 redondea al bloque)", maxRedeemablePoints(1000, 31_000) === 30, maxRedeemablePoints(1000, 31_000));
  check("max: subtotal 0 → 0", maxRedeemablePoints(1000, 0) === 0);

  // 3) Acreditación: base sin envío ni descuentos, vencimiento a 45 días
  const earner = await createUser("earner");
  const oBase = await paidOrder(earner.id, { subtotal: 1_234_500, deliveryCost: 99_900, pointsDiscount: 5_000 });
  const before = Date.now();
  const earned = await awardPointsOnPaid(null, oBase.id);
  check("award: ($12.345 − $50 de puntos, sin envío) → 122", earned === 122, earned);
  const lot = await prisma.pointsLot.findUnique({ where: { sourceOrderId: oBase.id } });
  const expDays = lot ? (lot.expiresAt.getTime() - before) / DAY_MS : -1;
  check("award: lote vence a los 45 días", expDays >= 44.99 && expDays <= 45.01, expDays);
  const oBaseAfter = await prisma.order.findUnique({ where: { id: oBase.id }, select: { pointsEarned: true } });
  check("award: Order.pointsEarned = 122", oBaseAfter?.pointsEarned === 122, oBaseAfter);

  // 4) Doble acreditación
  const again = await awardPointsOnPaid(null, oBase.id);
  const lotCount = await prisma.pointsLot.count({ where: { sourceOrderId: oBase.id } });
  const earnMoves = await prisma.pointsMovement.count({ where: { orderId: oBase.id, type: "EARN" } });
  check("award dos veces → 0, un solo lote y un solo EARN", again === 0 && lotCount === 1 && earnMoves === 1, { again, lotCount, earnMoves });

  // 5) Casos que no suman
  const oWelcome = await paidOrder(earner.id, { welcomeDiscount: 100_000 });
  check("compra con bienvenida → 0 puntos", (await awardPointsOnPaid(null, oWelcome.id)) === 0);
  const oMp = await paidOrder(earner.id, { paymentMethod: "MERCADO_PAGO" });
  check("Mercado Pago → 0 puntos", (await awardPointsOnPaid(null, oMp.id)) === 0);
  const oTalo = await paidOrder(earner.id, { paymentMethod: "TALO_PAY", subtotal: 500_000 });
  check("Talo pagado → 50 puntos", (await awardPointsOnPaid(null, oTalo.id)) === 50);
  const oPending = await createOrder({ userId: earner.id });
  check("pedido sin pagar → 0 puntos", (await awardPointsOnPaid(null, oPending.id)) === 0);
  const oGuest = await paidOrder(null);
  check("invitado → 0 puntos", (await awardPointsOnPaid(null, oGuest.id)) === 0);
  const admin = await createUser("admin", "ADMIN");
  const oAdmin = await paidOrder(admin.id);
  check("ADMIN → 0 puntos", (await awardPointsOnPaid(null, oAdmin.id)) === 0);

  // 6) Saldo: lote vencido y revocado no cuentan
  const fifo = await createUser("fifo");
  const lotA = await createLot(fifo.id, 60, 10);
  const lotB = await createLot(fifo.id, 100, 30);
  const lotExpired = await createLot(fifo.id, 500, -1);
  await createLot(fifo.id, 300, 20, true);
  const bal = await getPointsBalance(fifo.id);
  check("saldo ignora vencido y revocado → 160", bal.available === 160, bal);
  check("próximo vencimiento = lote de 60", bal.nextExpiry?.points === 60, bal.nextExpiry);

  // 7) Cotización
  const quote = (requestedPoints: number, extra: Partial<Parameters<typeof computePointsQuote>[0]> = {}) =>
    computePointsQuote({
      userId: fifo.id,
      subtotalCents: 1_000_000,
      welcomeDiscountCents: 0,
      requestedPoints,
      paymentMethod: "CASH",
      ...extra,
    });
  const qOk = await quote(100);
  check("quote 100 puntos → ok, $500 de descuento", qOk.ok && qOk.discountCents === 50_000, qOk);
  const qBlock = await quote(15);
  check("quote 15 → NOT_BLOCK_MULTIPLE", !qBlock.ok && qBlock.reason === "NOT_BLOCK_MULTIPLE", qBlock);
  const qBal = await quote(170);
  check("quote 170 con saldo 160 → EXCEEDS_BALANCE", !qBal.ok && qBal.reason === "EXCEEDS_BALANCE", qBal);
  const qCap = await quote(100, { subtotalCents: 20_000 });
  check("quote 100 sobre $200 (tope 20) → EXCEEDS_CAP", !qCap.ok && qCap.reason === "EXCEEDS_CAP", qCap);
  const qWelcome = await quote(100, { welcomeDiscountCents: 10_000 });
  check("quote con bienvenida → WITH_WELCOME", !qWelcome.ok && qWelcome.reason === "WITH_WELCOME", qWelcome);
  const qMp = await quote(100, { paymentMethod: "MERCADO_PAGO" });
  check("quote Mercado Pago → METHOD_NOT_ALLOWED", !qMp.ok && qMp.reason === "METHOD_NOT_ALLOWED", qMp);
  const qGuest = await quote(100, { userId: null });
  check("quote invitado → NOT_LOGGED_IN", !qGuest.ok && qGuest.reason === "NOT_LOGGED_IN", qGuest);
  const poor = await createUser("poor");
  await createLot(poor.id, 90, 10);
  const qPoor = await quote(10, { userId: poor.id });
  check("quote saldo 90 → BELOW_MINIMUM (aunque pida 10)", !qPoor.ok && qPoor.reason === "BELOW_MINIMUM", qPoor);

  // 8) Reserva FIFO por vencimiento
  const o1 = await createOrder({ userId: fifo.id });
  await reserve(fifo.id, o1.id, 100);
  const allocs = await prisma.pointsReservationAllocation.findMany({
    where: { reservation: { orderId: o1.id } },
    select: { lotId: true, points: true },
  });
  const byLot = new Map(allocs.map((a) => [a.lotId, a.points]));
  check("reserva 100 → 60 del lote que vence primero + 40 del siguiente",
    byLot.get(lotA.id) === 60 && byLot.get(lotB.id) === 40 && allocs.length === 2, allocs);
  const expiredAfter = await prisma.pointsLot.findUnique({ where: { id: lotExpired.id } });
  check("reserva no toca el lote vencido", expiredAfter?.remaining === 500, expiredAfter?.remaining);
  check("saldo después de reservar → 60", (await balanceOf(fifo.id)) === 60);
  const reserveMove = await prisma.pointsMovement.count({ where: { orderId: o1.id, type: "RESERVE" } });
  check("reserva deja movimiento RESERVE", reserveMove === 1, reserveMove);

  // 9) Liquidación idempotente
  const s1 = await settlePointsOnPaid(null, o1.id);
  const s2 = await settlePointsOnPaid(null, o1.id);
  const r1 = await prisma.pointsReservation.findUnique({ where: { orderId: o1.id } });
  check("settle → 1, segunda vez → 0, estado USED", s1 === 1 && s2 === 0 && r1?.status === "USED", { s1, s2, status: r1?.status });
  check("release de un canje USED → 0 (no devuelve)", (await releasePoints(null, o1.id)) === 0);
  check("saldo sigue en 60 después de liquidar", (await balanceOf(fifo.id)) === 60);

  // 10) Liberación idempotente
  const rel = await createUser("release");
  await createLot(rel.id, 200, 10);
  const o2 = await createOrder({ userId: rel.id });
  await reserve(rel.id, o2.id, 100);
  const l1 = await releasePoints(null, o2.id);
  const l2 = await releasePoints(null, o2.id);
  const r2 = await prisma.pointsReservation.findUnique({ where: { orderId: o2.id } });
  check("release → 1, segunda vez → 0, estado RELEASED", l1 === 1 && l2 === 0 && r2?.status === "RELEASED", { l1, l2, status: r2?.status });
  check("release devuelve el saldo → 200", (await balanceOf(rel.id)) === 200);
  check("settle de un canje RELEASED → 0", (await settlePointsOnPaid(null, o2.id)) === 0);

  // 11) Concurrencia: dos pestañas canjean 100 con saldo 150
  const race = await createUser("race");
  await createLot(race.id, 150, 10);
  const oA = await createOrder({ userId: race.id });
  const oB = await createOrder({ userId: race.id });
  const results = await Promise.allSettled([reserve(race.id, oA.id, 100), reserve(race.id, oB.id, 100)]);
  const okCount = results.filter((r) => r.status === "fulfilled").length;
  const conflicts = results.filter((r) => r.status === "rejected" && isPointsError(r.reason, "CONFLICT")).length;
  check("doble pestaña → una reserva OK y una CONFLICT", okCount === 1 && conflicts === 1, results.map((r) => r.status === "rejected" ? String(r.reason) : "ok"));
  check("doble pestaña → saldo final 50", (await balanceOf(race.id)) === 50);

  const dupErr = await errorOf(() => reserve(race.id, oA.id, 10));
  check("misma orden reservada dos veces → CONFLICT (sin saldo)", isPointsError(dupErr, "CONFLICT"), String(dupErr));
  const dup = await createUser("dup");
  await createLot(dup.id, 300, 10);
  const oDup = await createOrder({ userId: dup.id });
  await reserve(dup.id, oDup.id, 100);
  const dupErr2 = await errorOf(() => reserve(dup.id, oDup.id, 100));
  check("misma orden reservada dos veces → CONFLICT (con saldo)", isPointsError(dupErr2, "CONFLICT"), String(dupErr2));
  check("…y la transacción fallida no descontó saldo → 200", (await balanceOf(dup.id)) === 200);

  const badErr = await errorOf(() =>
    prisma.$transaction((tx) => reservePoints(tx, { userId: dup.id, orderId: oDup.id, points: 100, discountCents: 1 }))
  );
  check("reserva con monto que no coincide → INVALID_AMOUNT", isPointsError(badErr, "INVALID_AMOUNT"), String(badErr));

  // 12) Cancelación de pedido pagado sin saldo negativo
  const cancel = await createUser("cancel");
  const oP = await paidOrder(cancel.id, { subtotal: 1_000_000 });
  check("cancel: P gana 100", (await awardPointsOnPaid(null, oP.id)) === 100);
  const oQ = await createOrder({ userId: cancel.id });
  await reserve(cancel.id, oQ.id, 80);
  await settlePointsOnPaid(null, oQ.id);
  const rv1 = await revokePointsOnPaidCancel(null, oP.id);
  check("cancelar P (80 ya gastados) → quita 20, faltan 80", rv1.revoked === 20 && rv1.shortfall === 80 && rv1.restored === 0, rv1);
  const balCancel = await balanceOf(cancel.id);
  const negLots = await prisma.pointsLot.count({ where: { userId: cancel.id, remaining: { lt: 0 } } });
  check("cancelar P → saldo 0, nunca negativo", balCancel === 0 && negLots === 0, { balCancel, negLots });
  const rv2 = await revokePointsOnPaidCancel(null, oP.id);
  const revokeMoves = await prisma.pointsMovement.count({ where: { orderId: oP.id, type: "REVOKE" } });
  check("revocar dos veces → no duplica", rv2.revoked === 0 && rv2.restored === 0 && revokeMoves === 1, { rv2, revokeMoves });
  const rvQ = await revokePointsOnPaidCancel(null, oQ.id);
  check("cancelar Q devuelve 80 a un lote revocado → saldo sigue en 0", rvQ.restored === 80 && (await balanceOf(cancel.id)) === 0, rvQ);

  const restore = await createUser("restore");
  await createLot(restore.id, 200, 10);
  const oR = await createOrder({ userId: restore.id });
  await reserve(restore.id, oR.id, 100);
  await settlePointsOnPaid(null, oR.id);
  const rvR = await revokePointsOnPaidCancel(null, oR.id);
  check("cancelar pedido pagado → devuelve los 100 usados", rvR.restored === 100 && rvR.revoked === 0 && (await balanceOf(restore.id)) === 200, rvR);
  const rvR2 = await revokePointsOnPaidCancel(null, oR.id);
  check("devolver dos veces → no duplica", rvR2.restored === 0 && (await balanceOf(restore.id)) === 200, rvR2);

  // 13) Flag apagado: no cotiza/reserva/acredita, pero settle/release/revoke corren
  const off = await createUser("off");
  await createLot(off.id, 300, 10);
  const oS = await createOrder({ userId: off.id });
  const oT = await createOrder({ userId: off.id });
  await reserve(off.id, oS.id, 100);
  await reserve(off.id, oT.id, 100);
  setFlag(false);
  const qOff = await computePointsQuote({ userId: off.id, subtotalCents: 1_000_000, welcomeDiscountCents: 0, requestedPoints: 100, paymentMethod: "CASH" });
  check("flag off → quote DISABLED", !qOff.ok && qOff.reason === "DISABLED", qOff);
  const oU = await createOrder({ userId: off.id });
  const offErr = await errorOf(() => reserve(off.id, oU.id, 100));
  check("flag off → reservePoints rechaza DISABLED", isPointsError(offErr, "DISABLED"), String(offErr));
  const oPaidOff = await paidOrder(off.id);
  check("flag off → award no acredita", (await awardPointsOnPaid(null, oPaidOff.id)) === 0);
  check("flag off → release igual corre", (await releasePoints(null, oS.id)) === 1);
  check("flag off → settle igual corre", (await settlePointsOnPaid(null, oT.id)) === 1);
  check("flag off → revoke igual corre", (await revokePointsOnPaidCancel(null, oT.id)).restored === 100);
  check("flag off → saldo vuelve a 300", (await balanceOf(off.id)) === 300);
  const mOff = await computeMaxPointsQuote({ userId: off.id, subtotalCents: 1_000_000, welcomeDiscountCents: 0, paymentMethod: "CASH" });
  check("flag off → cotización del máximo DISABLED", !mOff.ok && mOff.reason === "DISABLED", mOff);
  setFlag(true);

  // 14) Cotización del máximo (lo que usan las rutas con usePoints: true)
  const maxU = await createUser("max");
  await createLot(maxU.id, 135, 10);
  const maxQuote = (extra: Partial<Parameters<typeof computeMaxPointsQuote>[0]> = {}) =>
    computeMaxPointsQuote({ userId: maxU.id, subtotalCents: 1_000_000, welcomeDiscountCents: 0, paymentMethod: "CASH", ...extra });
  const m1 = await maxQuote();
  check("máximo con saldo 135 → 130 puntos ($650)", m1.ok && m1.points === 130 && m1.discountCents === 65_000, m1);
  const m2 = await maxQuote({ subtotalCents: 30_000 });
  check("máximo sobre $300 → 30 puntos (tope 50%)", m2.ok && m2.points === 30, m2);
  const m3 = await maxQuote({ subtotalCents: 1_000 });
  check("máximo sobre $10 → EXCEEDS_CAP", !m3.ok && m3.reason === "EXCEEDS_CAP", m3);
  const m4 = await maxQuote({ paymentMethod: "MERCADO_PAGO" });
  check("máximo con Mercado Pago → METHOD_NOT_ALLOWED", !m4.ok && m4.reason === "METHOD_NOT_ALLOWED", m4);
  const m5 = await maxQuote({ welcomeDiscountCents: 100_000 });
  check("máximo con bienvenida → WITH_WELCOME", !m5.ok && m5.reason === "WITH_WELCOME", m5);
  const m6 = await maxQuote({ userId: poor.id });
  check("máximo con saldo 90 → BELOW_MINIMUM", !m6.ok && m6.reason === "BELOW_MINIMUM", m6);
  check("mensaje de rechazo para el cliente", pointsRejectionMessage("BELOW_MINIMUM").includes("100"));

  // 14b) expectedPoints: el servidor solo compara, nunca toma el monto del cliente
  const resolve = (expectedPoints: unknown, extra: Partial<Parameters<typeof computeMaxPointsQuote>[0]> = {}) =>
    resolvePointsRedemption({
      userId: maxU.id, subtotalCents: 1_000_000, welcomeDiscountCents: 0, paymentMethod: "CASH", expectedPoints, ...extra,
    });
  const rOk = await resolve(130);
  check("expectedPoints igual → canje 130 ($650)", rOk.points === 130 && rOk.discountCents === 65_000, rOk);
  const rDiff = await errorOf(() => resolve(120));
  check("expectedPoints distinto → CHANGED con la cotización nueva (130)",
    isPointsError(rDiff, "CHANGED") && rDiff instanceof PointsError && rDiff.change?.points === 130 && rDiff.change.discountCents === 65_000 && rDiff.change.reason === null,
    rDiff instanceof PointsError ? rDiff.change : String(rDiff));
  const rMissing = await errorOf(() => resolve(undefined));
  check("sin expectedPoints → CHANGED (nunca canjea a ciegas)", isPointsError(rMissing, "CHANGED"), String(rMissing));
  const rString = await errorOf(() => resolve("130"));
  check("expectedPoints como texto → CHANGED", isPointsError(rString, "CHANGED"), String(rString));
  const rPoor = await errorOf(() => resolve(100, { userId: poor.id }));
  check("saldo bajó de 100 → CHANGED con 0 puntos, motivo BELOW_MINIMUM y aviso de saldo",
    rPoor instanceof PointsError && rPoor.code === "CHANGED" && rPoor.change?.points === 0 &&
      rPoor.change.reason === "BELOW_MINIMUM" && rPoor.message === POINTS_CHANGED_MESSAGE,
    rPoor instanceof PointsError ? { msg: rPoor.message, change: rPoor.change } : String(rPoor));
  const rWelcome = await errorOf(() => resolve(130, { welcomeDiscountCents: 100_000 }));
  check("con bienvenida → CHANGED motivo WITH_WELCOME y su mensaje",
    rWelcome instanceof PointsError && rWelcome.change?.reason === "WITH_WELCOME" && rWelcome.message.includes("bienvenida"),
    rWelcome instanceof PointsError ? rWelcome.message : String(rWelcome));
  const body409 = rDiff instanceof PointsError ? pointsErrorBody(rDiff) : null;
  check("cuerpo del 409 → code POINTS_CHANGED con puntos y descuento",
    body409?.code === "POINTS_CHANGED" && body409.points === 130 && body409.discountCents === 65_000, body409);

  // 15) Flujo efectivo completo: pedido con puntos → cobrado → acredita
  //     sobre subtotal − puntos (mismas llamadas que /api/orders y mark-cash-paid).
  const cash = await createUser("cash");
  await createLot(cash.id, 200, 10);
  const cq = await computeMaxPointsQuote({ userId: cash.id, subtotalCents: 1_000_000, welcomeDiscountCents: 0, paymentMethod: "CASH" });
  const cashPoints = cq.ok ? cq.points : 0;
  const cashDiscount = cq.ok ? cq.discountCents : 0;
  const oCash = await prisma.$transaction(async (tx) => {
    const o = await tx.order.create({
      data: {
        userId: cash.id, customerName: "QA Points", phone: "0", deliveryMethod: "DELIVERY",
        paymentMethod: "CASH", status: "PENDING", subtotal: 1_000_000, deliveryCost: 150_000,
        total: 1_000_000 - cashDiscount + 150_000,
        pointsRedeemed: cashPoints, pointsDiscount: cashDiscount,
      },
    });
    await reservePoints(tx, { userId: cash.id, orderId: o.id, points: cashPoints, discountCents: cashDiscount });
    return o;
  });
  created.orderIds.push(oCash.id);
  check("efectivo: canjea 200 puntos, total = $10.000 − $1.000 + envío", cashPoints === 200 && oCash.total === 1_050_000, { cashPoints, total: oCash.total });
  check("efectivo: saldo reservado → 0", (await balanceOf(cash.id)) === 0);

  const markPaid = (orderId: string) =>
    prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id: orderId, paymentStatus: { not: "PAID" }, status: { not: "CANCELLED" } },
        data: { paymentStatus: "PAID", paidAt: new Date() },
      });
      if (count > 0) {
        await settlePointsOnPaid(tx, orderId);
        await awardPointsOnPaid(tx, orderId);
      }
      return count;
    });
  const paidResults = await Promise.all([markPaid(oCash.id), markPaid(oCash.id)]);
  const cashLots = await prisma.pointsLot.findMany({ where: { sourceOrderId: oCash.id } });
  const cashRes = await prisma.pointsReservation.findUnique({ where: { orderId: oCash.id } });
  check("efectivo: doble 'marcar cobrado' → un solo guard gana",
    paidResults.filter((c) => c > 0).length === 1, paidResults);
  check("efectivo: gana 90 puntos ($9.000 = $10.000 − $1.000, sin envío), un solo lote",
    cashLots.length === 1 && cashLots[0]?.earned === 90, cashLots.map((l) => l.earned));
  check("efectivo: canje USED y saldo 90", cashRes?.status === "USED" && (await balanceOf(cash.id)) === 90, cashRes?.status);

  // 16) Cancelación del admin (mismas llamadas que PATCH /api/admin/orders/[id])
  const adminCancel = (orderId: string) =>
    prisma.$transaction(async (tx) => {
      await releasePoints(tx, orderId);
      return revokePointsOnPaidCancel(tx, orderId);
    });
  const cancelPaid = await adminCancel(oCash.id);
  check("cancelar efectivo pagado → devuelve 200 usados y quita 90 ganados",
    cancelPaid.restored === 200 && cancelPaid.revoked === 90 && (await balanceOf(cash.id)) === 200, cancelPaid);
  const cancelAgain = await adminCancel(oCash.id);
  check("cancelar dos veces → no cambia nada",
    cancelAgain.restored === 0 && cancelAgain.revoked === 0 && (await balanceOf(cash.id)) === 200, cancelAgain);

  const oUnpaid = await createOrder({ userId: cash.id });
  await reserve(cash.id, oUnpaid.id, 100);
  const cancelUnpaid = await adminCancel(oUnpaid.id);
  const unpaidRes = await prisma.pointsReservation.findUnique({ where: { orderId: oUnpaid.id } });
  check("cancelar sin pagar → libera (RELEASED), revoke no hace nada",
    unpaidRes?.status === "RELEASED" && cancelUnpaid.restored === 0 && cancelUnpaid.revoked === 0 && (await balanceOf(cash.id)) === 200,
    { status: unpaidRes?.status, cancelUnpaid });

  // 17) Talo vencido con reserva (mismas llamadas que la rama EXPIRED)
  const oTaloExp = await createOrder({ userId: cash.id, paymentMethod: "TALO_PAY" });
  await reserve(cash.id, oTaloExp.id, 100);
  check("Talo vencido: saldo reservado → 100", (await balanceOf(cash.id)) === 100);
  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({
      where: { id: oTaloExp.id, paymentStatus: { not: "PAID" } },
      data: { paymentStatus: "FAILED", status: "CANCELLED" },
    });
    await releasePoints(tx, oTaloExp.id);
  });
  check("Talo vencido → libera, saldo 200", (await balanceOf(cash.id)) === 200);
  check("Talo vencido y después pago tardío → no acredita (cancelado)",
    (await awardPointsOnPaid(null, oTaloExp.id)) === 0);
}

async function cleanup() {
  const users = { in: created.userIds };
  await prisma.pointsReservationAllocation.deleteMany({ where: { reservation: { userId: users } } });
  await prisma.pointsReservation.deleteMany({ where: { userId: users } });
  await prisma.pointsMovement.deleteMany({ where: { userId: users } });
  await prisma.pointsLot.deleteMany({ where: { userId: users } });
  await prisma.order.deleteMany({ where: { id: { in: created.orderIds } } });
  await prisma.user.deleteMany({ where: { id: users } });
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
