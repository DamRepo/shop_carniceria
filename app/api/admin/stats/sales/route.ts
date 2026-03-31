import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Period = "week" | "month" | "quarter";

type RawRow = {
  date: string;
  orders: bigint | number;
  revenue: bigint | number;
};

export type SalesDataPoint = {
  date: string;
  label: string;
  orders: number;
  revenue: number; // centavos
};

export type SalesSummary = {
  totalOrders: number;
  totalRevenue: number; // centavos
  avgTicket: number;    // centavos
  periodLabel: string;
};

export type SalesStatsResponse = {
  period: Period;
  data: SalesDataPoint[];
  summary: SalesSummary;
};

const ES_DAYS   = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;
const ES_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun",
                   "jul", "ago", "sep", "oct", "nov", "dic"] as const;

function getDateRange(period: Period): { startDate: Date; groupBy: "day" | "week" } {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);

  if (period === "week") {
    startDate.setDate(startDate.getDate() - 6);
    return { startDate, groupBy: "day" };
  }
  if (period === "month") {
    startDate.setDate(startDate.getDate() - 29);
    return { startDate, groupBy: "day" };
  }
  // quarter: last 90 days, grouped by ISO week (Monday)
  startDate.setDate(startDate.getDate() - 89);
  return { startDate, groupBy: "week" };
}

function fillDays(
  startDate: Date,
  endDate: Date,
  rawMap: Map<string, { orders: number; revenue: number }>
): SalesDataPoint[] {
  const points: SalesDataPoint[] = [];
  const cur = new Date(startDate);
  cur.setHours(0, 0, 0, 0);

  while (cur <= endDate) {
    const key = cur.toISOString().slice(0, 10); // YYYY-MM-DD
    const d = rawMap.get(key) ?? { orders: 0, revenue: 0 };
    points.push({
      date: key,
      label: `${ES_DAYS[cur.getDay()]} ${cur.getDate()}`,
      orders: d.orders,
      revenue: d.revenue,
    });
    cur.setDate(cur.getDate() + 1);
  }

  return points;
}

function fillWeeks(
  startDate: Date,
  endDate: Date,
  rawMap: Map<string, { orders: number; revenue: number }>
): SalesDataPoint[] {
  const points: SalesDataPoint[] = [];

  // Snap back to the Monday on or before startDate
  const cur = new Date(startDate);
  cur.setHours(0, 0, 0, 0);
  const dow = cur.getDay(); // 0 = Sun
  cur.setDate(cur.getDate() + (dow === 0 ? -6 : 1 - dow));

  while (cur <= endDate) {
    const key = cur.toISOString().slice(0, 10);
    const d = rawMap.get(key) ?? { orders: 0, revenue: 0 };
    points.push({
      date: key,
      label: `${cur.getDate()} ${ES_MONTHS[cur.getMonth()]}`,
      orders: d.orders,
      revenue: d.revenue,
    });
    cur.setDate(cur.getDate() + 7);
  }

  return points;
}

async function queryByDay(startDate: Date, now: Date): Promise<RawRow[]> {
  return prisma.$queryRaw<RawRow[]>`
    SELECT
      TO_CHAR(
        DATE_TRUNC('day', COALESCE("paidAt", "confirmedAt", "createdAt")),
        'YYYY-MM-DD'
      )                AS date,
      COUNT(*)::int    AS orders,
      SUM(total)::bigint AS revenue
    FROM "Order"
    WHERE
      ("paymentStatus"::text = 'PAID' OR status::text = 'COMPLETED')
      AND COALESCE("paidAt", "confirmedAt", "createdAt") >= ${startDate}
      AND COALESCE("paidAt", "confirmedAt", "createdAt") <= ${now}
    GROUP BY DATE_TRUNC('day', COALESCE("paidAt", "confirmedAt", "createdAt"))
    ORDER BY DATE_TRUNC('day', COALESCE("paidAt", "confirmedAt", "createdAt"))
  `;
}

async function queryByWeek(startDate: Date, now: Date): Promise<RawRow[]> {
  return prisma.$queryRaw<RawRow[]>`
    SELECT
      TO_CHAR(
        DATE_TRUNC('week', COALESCE("paidAt", "confirmedAt", "createdAt")),
        'YYYY-MM-DD'
      )                AS date,
      COUNT(*)::int    AS orders,
      SUM(total)::bigint AS revenue
    FROM "Order"
    WHERE
      ("paymentStatus"::text = 'PAID' OR status::text = 'COMPLETED')
      AND COALESCE("paidAt", "confirmedAt", "createdAt") >= ${startDate}
      AND COALESCE("paidAt", "confirmedAt", "createdAt") <= ${now}
    GROUP BY DATE_TRUNC('week', COALESCE("paidAt", "confirmedAt", "createdAt"))
    ORDER BY DATE_TRUNC('week', COALESCE("paidAt", "confirmedAt", "createdAt"))
  `;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const role = (session?.user as any)?.role as string | undefined;

    if (!session?.user || !role) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const periodParam = searchParams.get("period") ?? "week";
    const period: Period = ["week", "month", "quarter"].includes(periodParam)
      ? (periodParam as Period)
      : "week";

    const { startDate, groupBy } = getDateRange(period);
    const now = new Date();

    const rawRows =
      groupBy === "day"
        ? await queryByDay(startDate, now)
        : await queryByWeek(startDate, now);

    // BigInt → number conversion
    const rawMap = new Map<string, { orders: number; revenue: number }>();
    for (const row of rawRows) {
      rawMap.set(row.date, {
        orders:  Number(row.orders),
        revenue: Number(row.revenue),
      });
    }

    const data: SalesDataPoint[] =
      groupBy === "day"
        ? fillDays(startDate, now, rawMap)
        : fillWeeks(startDate, now, rawMap);

    const totalOrders  = data.reduce((s, d) => s + d.orders,  0);
    const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
    const avgTicket    = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const periodLabel =
      period === "week"    ? "Últimos 7 días"
      : period === "month" ? "Últimos 30 días"
      : "Últimos 3 meses";

    return NextResponse.json({
      period,
      data,
      summary: { totalOrders, totalRevenue, avgTicket, periodLabel },
    } satisfies SalesStatsResponse);
  } catch (e) {
    console.error("GET /api/admin/stats/sales error:", e);
    return NextResponse.json(
      { error: "Error cargando estadísticas de ventas" },
      { status: 500 }
    );
  }
}
