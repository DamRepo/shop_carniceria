export type ReadyEstimate = {
  readyAt: Date;
  note: string;
};

function setTime(base: Date, h: number, m: number) {
  const x = new Date(base);
  x.setHours(h, m, 0, 0);
  return x;
}

function addHours(base: Date, hours: number) {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

function inRange(t: Date, start: Date, end: Date) {
  return t >= start && t < end;
}

/** Devuelve el Date de la proxima apertura a partir de `from` (dia siguiente). */
function nextOpeningAfter(from: Date): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + 1);
  const [h, m] = next.getDay() === 0 ? [8, 30] : [7, 30];
  return setTime(next, h, m);
}

export function estimateReadyAt(purchasedAt: Date, prepHours = 2): ReadyEstimate {
  const d = new Date(purchasedAt);
  const day = d.getDay();
  const isSunday = day === 0;

  const ranges = isSunday
    ? [{ start: [8, 30] as const, end: [13, 0] as const }]
    : [
        { start: [7, 30] as const, end: [13, 0] as const },
        { start: [16, 0] as const, end: [21, 0] as const },
      ];

  for (let i = 0; i < ranges.length; i++) {
    const start = setTime(d, ranges[i].start[0], ranges[i].start[1]);
    const end = setTime(d, ranges[i].end[0], ranges[i].end[1]);

    if (inRange(d, start, end)) {
      const candidate = addHours(d, prepHours);
      if (candidate <= end) {
        return { readyAt: candidate, note: "Estimacion segun horario del local." };
      }

      if (i + 1 < ranges.length) {
        const nextStart = setTime(d, ranges[i + 1].start[0], ranges[i + 1].start[1]);
        return {
          readyAt: addHours(nextStart, prepHours),
          note: "Fuera del horario de atencion, se estima para el proximo turno.",
        };
      }

      const nextOpen = nextOpeningAfter(d);
      return {
        readyAt: addHours(nextOpen, prepHours),
        note: "Fuera del horario de atencion, se estima para la proxima apertura.",
      };
    }
  }

  const openToday = setTime(d, ranges[0].start[0], ranges[0].start[1]);
  if (d < openToday) {
    return {
      readyAt: addHours(openToday, prepHours),
      note: "Aun no abrimos: se estima para hoy cuando inicie la atencion.",
    };
  }

  const nextOpen = nextOpeningAfter(d);
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

export function isCheckoutBlocked(): boolean {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const minutes = hour * 60 + minute;
  if (weekday === "Sun" && minutes >= 13 * 60) return true;
  if (weekday === "Mon" && minutes < 8 * 60) return true;
  return false;
}

export type ProcessingStatus =
  | { kind: "open" }
  | { kind: "later_today"; hour: number }
  | { kind: "next_day" }
  | { kind: "next_monday" };

export function getOrderProcessingStatus(): ProcessingStatus {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const minutes = hour * 60 + minute;

  const AM_OPEN = 8 * 60;
  const AM_CLOSE = 13 * 60;
  const PM_OPEN = 17 * 60;
  const PM_CLOSE = 21 * 60;

  if (weekday === "Sun") {
    if (minutes >= AM_OPEN && minutes < AM_CLOSE) return { kind: "open" };
    if (minutes < AM_OPEN) return { kind: "later_today", hour: 8 };
    return { kind: "next_monday" };
  }

  if (
    (minutes >= AM_OPEN && minutes < AM_CLOSE) ||
    (minutes >= PM_OPEN && minutes < PM_CLOSE)
  )
    return { kind: "open" };
  if (minutes < AM_OPEN) return { kind: "later_today", hour: 8 };
  if (minutes >= AM_CLOSE && minutes < PM_OPEN)
    return { kind: "later_today", hour: 17 };
  return { kind: "next_day" };
}
