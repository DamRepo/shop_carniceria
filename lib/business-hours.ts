export type ReadyEstimate = {
  readyAt: Date;
  note: string; // texto corto para explicar si se corrió por horario
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

/**
 * Calcula "listo estimado" sumando 2 horas de preparación,
 * respetando horarios del local:
 * Lun–Sáb 07:30–13:00 y 17:00–22:00
 * Dom 08:00–13:00
 */
export function estimateReadyAt(purchasedAt: Date, prepHours = 2): ReadyEstimate {
  const d = new Date(purchasedAt);
  const day = d.getDay(); // 0=domingo
  const isSunday = day === 0;

  const ranges = isSunday
    ? [{ start: [8, 0] as const, end: [13, 0] as const }]
    : [
        { start: [7, 30] as const, end: [13, 0] as const },
        { start: [17, 0] as const, end: [22, 0] as const },
      ];

  // 1) Si compra dentro de un rango abierto
  for (let i = 0; i < ranges.length; i++) {
    const start = setTime(d, ranges[i].start[0], ranges[i].start[1]);
    const end = setTime(d, ranges[i].end[0], ranges[i].end[1]);

    if (inRange(d, start, end)) {
      const candidate = addHours(d, prepHours);
      if (candidate <= end) {
        return { readyAt: candidate, note: "Estimación según horario del local." };
      }

      // Se pasa del cierre: saltar al siguiente rango del mismo día si existe
      if (i + 1 < ranges.length) {
        const nextStart = setTime(d, ranges[i + 1].start[0], ranges[i + 1].start[1]);
        return {
          readyAt: addHours(nextStart, prepHours),
          note: "Fuera del horario de atención, se estima para el próximo turno.",
        };
      }

      // No hay más rangos hoy: saltar al próximo día (mañana)
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const nextIsSunday = next.getDay() === 0;
      const open = nextIsSunday ? [8, 0] : [7, 30];
      const nextOpen = setTime(next, open[0], open[1]);

      return {
        readyAt: addHours(nextOpen, prepHours),
        note: "Fuera del horario de atención, se estima para la próxima apertura.",
      };
    }
  }

  // 2) Si compra fuera de horario: próxima apertura + prep
  const openToday = setTime(d, ranges[0].start[0], ranges[0].start[1]);
  if (d < openToday) {
    return {
      readyAt: addHours(openToday, prepHours),
      note: "Aún no abrimos: se estima para hoy cuando inicie la atención.",
    };
  }

  // Después de cerrar: próxima apertura del día siguiente
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  const nextIsSunday = next.getDay() === 0;
  const open = nextIsSunday ? [8, 0] : [7, 30];
  const nextOpen = setTime(next, open[0], open[1]);

  return {
    readyAt: addHours(nextOpen, prepHours),
    note: "Fuera del horario de atención, se estima para la próxima apertura.",
  };
}

export function formatReadyAtEsAR(date: Date) {
  // “viernes 19:10”
  return date.toLocaleString("es-AR", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}
