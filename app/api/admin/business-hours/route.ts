import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  FALLBACK_STORE_HOURS,
  storeHoursToRows,
  validateBusinessHours,
  type BusinessHoursRow,
} from "@/lib/business-hours";
import { invalidateStoreHoursCache } from "@/lib/business-hours-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// "" o ausente → null (turno vacío). El formato HH:mm lo valida validateBusinessHours.
const timeField = z
  .string()
  .trim()
  .max(5)
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

const bodySchema = z.object({
  days: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        isClosed: z.boolean(),
        openMorning: timeField,
        closeMorning: timeField,
        openAfternoon: timeField,
        closeAfternoon: timeField,
      })
    )
    .length(7),
});

const rowSelect = {
  dayOfWeek: true,
  isClosed: true,
  openMorning: true,
  closeMorning: true,
  openAfternoon: true,
  closeAfternoon: true,
} as const;

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return !!session && session.user.role === "ADMIN";
}

/** Horario editable. Si la tabla está vacía o inválida, devuelve el que la app está usando (el fijo). */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const rows: BusinessHoursRow[] = await prisma.businessHours.findMany({
      select: rowSelect,
      orderBy: { dayOfWeek: "asc" },
    });
    const valid = validateBusinessHours(rows).ok;

    return NextResponse.json({
      days: valid ? rows : storeHoursToRows(FALLBACK_STORE_HOURS),
      usingFallback: !valid,
    });
  } catch (err) {
    console.error("GET /api/admin/business-hours error:", err);
    return NextResponse.json({ error: "No se pudo leer el horario" }, { status: 500 });
  }
}

/** Reemplaza los 7 días. Rechaza cualquier horario que la app después descartaría. */
export async function PUT(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const rows: BusinessHoursRow[] = parsed.data.days;
  const validation = validateBusinessHours(rows);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    await prisma.$transaction(
      rows.map(({ dayOfWeek, ...data }) =>
        prisma.businessHours.upsert({
          where: { dayOfWeek },
          create: { dayOfWeek, ...data },
          update: data,
        })
      )
    );
  } catch (err) {
    console.error("PUT /api/admin/business-hours error:", err);
    return NextResponse.json({ error: "No se pudo guardar el horario" }, { status: 500 });
  }

  invalidateStoreHoursCache();
  return NextResponse.json({ days: rows });
}
