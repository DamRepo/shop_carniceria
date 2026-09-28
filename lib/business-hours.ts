/**
 * Horario único del local, en hora de Argentina. Lo usan el retiro, el envío,
 * el checkout, el home y la orden confirmada: no definir horarios en otro lado.
 */

export const STORE_TIME_ZONE = "America/Argentina/Buenos_Aires";

/** Turno en minutos desde las 00:00 (hora Argentina). `end` es exclusivo. */
export type ShiftRange = { start: number; end: number };

const hm = (h: number, m = 0) => h * 60 + m;

const MON_TO_SAT: ShiftRange[] = [
  { start: hm(7, 30), end: hm(13) },
  { start: hm(16), end: hm(21) },
];

/** Horario semanal: índice = día de la semana (0 = domingo). Día sin turnos = cerrado. */
export type StoreHours = ShiftRange[][];

/**
 * Horario fijo de respaldo. Se usa si la tabla BusinessHours está vacía, es
 * inválida o la consulta falla, y mientras el cliente todavía no la cargó.
 */
export const FALLBACK_STORE_HOURS: StoreHours = [
  [{ start: hm(8, 30), end: hm(13) }], // domingo
  MON_TO_SAT,
  MON_TO_SAT,
  MON_TO_SAT,
  MON_TO_SAT,
  MON_TO_SAT,
  MON_TO_SAT, // sábado
];

/** Franjas de retiro base; slotsForDate las recorta al horario de cada día. */
const PICKUP_SLOT_TEMPLATE: ShiftRange[] = [
  { start: hm(7, 30), end: hm(9, 30) },
  { start: hm(9, 30), end: hm(11, 30) },
  { start: hm(11, 30), end: hm(13) },
  { start: hm(16), end: hm(18) },
  { start: hm(18), end: hm(21) },
];

// ─── Fechas en hora Argentina ───────────────────────────────────────────────
// Las fechas van como "YYYY-MM-DD" del calendario argentino + minutos del día,
// así el cálculo no depende de la zona horaria del navegador ni del servidor.

export type StoreNow = { dateString: string; weekday: number; minutes: number };

export type StoreShift = ShiftRange & { dateString: string; weekday: number };

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function getStoreNow(date: Date = new Date()): StoreNow {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";

  return {
    dateString: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** Suma días a una fecha "YYYY-MM-DD" (aritmética de calendario, sin zona horaria). */
export function addDaysToDateString(dateString: string, days: number): string {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function weekdayOfDateString(dateString: string): number {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function formatMinutes(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** "07:30 - 13:00 y 16:00 - 21:00" */
export function formatShifts(shifts: ShiftRange[], separator = " - "): string {
  return shifts.map((s) => `${formatMinutes(s.start)}${separator}${formatMinutes(s.end)}`).join(" y ");
}

// ─── Horario desde la base ──────────────────────────────────────────────────

/** Fila de BusinessHours (sin depender del cliente de Prisma: este archivo lo usa el navegador). */
export type BusinessHoursRow = {
  dayOfWeek: number;
  openMorning: string | null;
  closeMorning: string | null;
  openAfternoon: string | null;
  closeAfternoon: string | null;
  isClosed: boolean;
};

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseHHMM(value: string): number | null {
  const m = HHMM.exec(value);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

const DAY_NAMES_CAP = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** Un par apertura/cierre: ambos vacíos (sin turno), o ambos válidos con apertura < cierre. */
function parseShift(
  open: string | null,
  close: string | null,
  label: string
): { shift: ShiftRange | null } | { error: string } {
  if (!open && !close) return { shift: null };
  if (!open || !close) return { error: `completá apertura y cierre del turno ${label} (o dejá los dos vacíos)` };
  const start = parseHHMM(open);
  const end = parseHHMM(close);
  if (start === null) return { error: `la hora "${open}" no tiene formato HH:mm` };
  if (end === null) return { error: `la hora "${close}" no tiene formato HH:mm` };
  if (start >= end) return { error: `la apertura del turno ${label} tiene que ser antes del cierre` };
  return { shift: { start, end } };
}

export type BusinessHoursValidation = { ok: true; hours: StoreHours } | { ok: false; error: string };

/**
 * Valida las 7 filas de BusinessHours y las convierte en horario semanal.
 * Reglas: los 7 días exactos, horas "HH:mm", apertura < cierre, la mañana
 * cierra antes de que abra la tarde, un día abierto tiene al menos un turno,
 * y no puede estar toda la semana cerrada.
 */
export function validateBusinessHours(rows: BusinessHoursRow[]): BusinessHoursValidation {
  if (rows.length !== 7) return { ok: false, error: "Tienen que estar los 7 días de la semana." };

  const hours: StoreHours = [];
  for (let day = 0; day < 7; day++) {
    const row = rows.find((r) => r.dayOfWeek === day);
    if (!row) return { ok: false, error: `Falta el ${DAY_NAMES_CAP[day].toLowerCase()}.` };
    const fail = (msg: string): BusinessHoursValidation => ({
      ok: false,
      error: `${DAY_NAMES_CAP[day]}: ${msg}.`,
    });

    if (row.isClosed) {
      hours[day] = [];
      continue;
    }

    const morning = parseShift(row.openMorning, row.closeMorning, "mañana");
    if ("error" in morning) return fail(morning.error);
    const afternoon = parseShift(row.openAfternoon, row.closeAfternoon, "tarde");
    if ("error" in afternoon) return fail(afternoon.error);
    if (morning.shift && afternoon.shift && morning.shift.end > afternoon.shift.start) {
      return fail("la mañana tiene que cerrar antes de que abra la tarde");
    }

    const shifts = [morning.shift, afternoon.shift].filter((s): s is ShiftRange => s !== null);
    if (shifts.length === 0) return fail('marcá "cerrado todo el día" o cargá al menos un turno');
    hours[day] = shifts;
  }

  if (hours.every((shifts) => shifts.length === 0)) {
    return { ok: false, error: "No puede estar toda la semana cerrada." };
  }
  return { ok: true, hours };
}

/**
 * Convierte las 7 filas en horario semanal, o null si algo no cierra: en ese
 * caso se usa FALLBACK_STORE_HOURS completo, nunca una mezcla.
 */
export function parseStoreHours(rows: BusinessHoursRow[]): StoreHours | null {
  const result = validateBusinessHours(rows);
  return result.ok ? result.hours : null;
}

/** Horario semanal → 7 filas (primer turno = mañana, segundo = tarde). Para precargar el admin. */
export function storeHoursToRows(hours: StoreHours): BusinessHoursRow[] {
  return hours.map((shifts, dayOfWeek) => ({
    dayOfWeek,
    isClosed: shifts.length === 0,
    openMorning: shifts[0] ? formatMinutes(shifts[0].start) : null,
    closeMorning: shifts[0] ? formatMinutes(shifts[0].end) : null,
    openAfternoon: shifts[1] ? formatMinutes(shifts[1].start) : null,
    closeAfternoon: shifts[1] ? formatMinutes(shifts[1].end) : null,
  }));
}

function isShiftRange(value: unknown): value is ShiftRange {
  if (typeof value !== "object" || value === null) return false;
  const { start, end } = value as Record<string, unknown>;
  return Number.isInteger(start) && Number.isInteger(end) && (start as number) < (end as number);
}

/** Valida la forma del horario recibido por la API (el cliente no confía en la respuesta). */
export function isStoreHoursShape(value: unknown): value is StoreHours {
  if (!Array.isArray(value) || value.length !== 7) return false;
  const days = value as unknown[];
  if (!days.every((day) => Array.isArray(day) && day.every(isShiftRange))) return false;
  return days.some((day) => (day as unknown[]).length > 0);
}

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS_LONG = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAY_LABELS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/**
 * Horario legible, agrupando días consecutivos iguales (lunes primero).
 * long:  ["Lunes a Sábado: 07:30 - 13:00 y 16:00 - 21:00", "Domingo: 08:30 - 13:00"]
 * short: ["Lun–Sáb 07:30–13:00 y 16:00–21:00", "Dom 08:30–13:00"]
 */
export function describeWeekHours(hours: StoreHours, style: "long" | "short" = "long"): string[] {
  const groups: { from: number; to: number; key: string }[] = [];
  for (const day of WEEK_ORDER) {
    const key = JSON.stringify(hours[day]);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.to = day;
    else groups.push({ from: day, to: day, key });
  }

  const labels = style === "long" ? DAY_LABELS_LONG : DAY_LABELS_SHORT;
  return groups.map((g) => {
    const days =
      g.from === g.to ? labels[g.from] : `${labels[g.from]}${style === "long" ? " a " : "–"}${labels[g.to]}`;
    const shifts = hours[g.from];
    const text = shifts.length === 0 ? "Cerrado" : formatShifts(shifts, style === "long" ? " - " : "–");
    return style === "long" ? `${days}: ${text}` : `${days} ${text}`;
  });
}

// ─── Consultas de horario ───────────────────────────────────────────────────

/** Turno abierto en este momento, o null si el local está cerrado. */
export function currentShift(
  from: Date = new Date(),
  hours: StoreHours = FALLBACK_STORE_HOURS
): StoreShift | null {
  const now = getStoreNow(from);
  const shift = hours[now.weekday].find((s) => now.minutes >= s.start && now.minutes < s.end);
  return shift ? { ...shift, dateString: now.dateString, weekday: now.weekday } : null;
}

export function isOpenNow(from: Date = new Date(), hours: StoreHours = FALLBACK_STORE_HOURS): boolean {
  return currentShift(from, hours) !== null;
}

/** Próximo turno que empieza después de `from` (más tarde hoy o en los días siguientes). */
export function nextOpening(from: Date = new Date(), hours: StoreHours = FALLBACK_STORE_HOURS): StoreShift {
  const now = getStoreNow(from);
  for (let i = 0; i <= 7; i++) {
    const dateString = addDaysToDateString(now.dateString, i);
    const weekday = weekdayOfDateString(dateString);
    const shift = hours[weekday].find((s) => i > 0 || s.start > now.minutes);
    if (shift) return { ...shift, dateString, weekday };
  }
  throw new Error("El horario no tiene ningún turno");
}

/** Turno en que sale un envío pedido ahora: el actual si está abierto, si no el próximo. */
export function nextDeliveryWindow(
  from: Date = new Date(),
  hours: StoreHours = FALLBACK_STORE_HOURS
): StoreShift {
  return currentShift(from, hours) ?? nextOpening(from, hours);
}

/** Franjas de retiro ("HH:MM a HH:MM") de ese día, recortadas a su horario. */
export function slotsForDate(dateString: string, hours: StoreHours = FALLBACK_STORE_HOURS): string[] {
  const shifts = hours[weekdayOfDateString(dateString)];
  const slots: string[] = [];
  for (const slot of PICKUP_SLOT_TEMPLATE) {
    for (const shift of shifts) {
      const start = Math.max(slot.start, shift.start);
      const end = Math.min(slot.end, shift.end);
      if (end > start) slots.push(`${formatMinutes(start)} a ${formatMinutes(end)}`);
    }
  }
  return slots;
}

/**
 * "hoy a las 16:00" | "mañana a las 07:30" | "el martes a las 07:30".
 * Con withDate: "mañana, lunes 28 de septiembre, a las 07:30" | "el martes 29 de septiembre a las 07:30".
 */
export function describeShiftStart(shift: StoreShift, from: Date = new Date(), withDate = false): string {
  const today = getStoreNow(from).dateString;
  const time = `a las ${formatMinutes(shift.start)}`;
  const [, month, day] = shift.dateString.split("-").map(Number);
  const dayName = DAY_NAMES[shift.weekday];
  const fullDate = `${dayName} ${day} de ${MONTH_NAMES[month - 1]}`;

  if (shift.dateString === today) return `hoy ${time}`;
  if (shift.dateString === addDaysToDateString(today, 1)) {
    return withDate ? `mañana, ${fullDate}, ${time}` : `mañana ${time}`;
  }
  return withDate ? `el ${fullDate} ${time}` : `el ${dayName} ${time}`;
}

// ─── Estado para el home ────────────────────────────────────────────────────

export type ProcessingStatus =
  | { kind: "open"; closesAt: string }
  | { kind: "closed"; opensAt: string };

export function getOrderProcessingStatus(
  from: Date = new Date(),
  hours: StoreHours = FALLBACK_STORE_HOURS
): ProcessingStatus {
  const open = currentShift(from, hours);
  if (open) return { kind: "open", closesAt: formatMinutes(open.end) };
  return { kind: "closed", opensAt: describeShiftStart(nextOpening(from, hours), from) };
}

// ─── Estimación de "listo para retirar" (Mis compras) ───────────────────────

export type ReadyEstimate = {
  readyAt: Date;
  note: string;
};

// Ojo: estas funciones usan la hora local del proceso, no fuerzan Argentina.
// Pendiente: verificar la zona horaria del VPS en el deploy.
function atMinutes(base: Date, minutes: number) {
  const x = new Date(base);
  x.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return x;
}

function addHours(base: Date, hours: number) {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

function inRange(t: Date, start: Date, end: Date) {
  return t >= start && t < end;
}

/** Devuelve el Date de la proxima apertura a partir de `from` (desde el dia siguiente, salteando dias cerrados). */
function nextOpeningAfter(from: Date, hours: StoreHours): Date {
  const next = new Date(from);
  for (let i = 0; i < 7; i++) {
    next.setDate(next.getDate() + 1);
    const first = hours[next.getDay()][0];
    if (first) return atMinutes(next, first.start);
  }
  // Inalcanzable con un horario validado (al menos un día abierto).
  return next;
}

export function estimateReadyAt(
  purchasedAt: Date,
  prepHours = 2,
  hours: StoreHours = FALLBACK_STORE_HOURS
): ReadyEstimate {
  const d = new Date(purchasedAt);
  const ranges = hours[d.getDay()];

  for (let i = 0; i < ranges.length; i++) {
    const start = atMinutes(d, ranges[i].start);
    const end = atMinutes(d, ranges[i].end);

    if (inRange(d, start, end)) {
      const candidate = addHours(d, prepHours);
      if (candidate <= end) {
        return { readyAt: candidate, note: "Estimacion segun horario del local." };
      }

      if (i + 1 < ranges.length) {
        const nextStart = atMinutes(d, ranges[i + 1].start);
        return {
          readyAt: addHours(nextStart, prepHours),
          note: "Fuera del horario de atencion, se estima para el proximo turno.",
        };
      }

      const nextOpen = nextOpeningAfter(d, hours);
      return {
        readyAt: addHours(nextOpen, prepHours),
        note: "Fuera del horario de atencion, se estima para la proxima apertura.",
      };
    }
  }

  // Día cerrado (sin turnos): directo a la próxima apertura.
  const openToday = ranges.length > 0 ? atMinutes(d, ranges[0].start) : null;
  if (openToday && d < openToday) {
    return {
      readyAt: addHours(openToday, prepHours),
      note: "Aun no abrimos: se estima para hoy cuando inicie la atencion.",
    };
  }

  const nextOpen = nextOpeningAfter(d, hours);
  return {
    readyAt: addHours(nextOpen, prepHours),
    note: "Fuera del horario de atencion, se estima para la proxima apertura.",
  };
}

export function formatReadyAtEsAR(date: Date) {
  return date.toLocaleString("es-AR", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}
