"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ShoppingCart, Receipt, Loader2 } from "lucide-react";
import type { SalesDataPoint, SalesSummary } from "@/app/api/admin/stats/sales/route";

type Period = "week" | "month" | "quarter";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "week",    label: "Semana" },
  { value: "month",   label: "Mes"    },
  { value: "quarter", label: "Trimestre" },
];

/* ── helpers ─────────────────────────────────────────────────────────────── */

function formatARS(cents: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(cents / 100));
}

function formatARSShort(cents: number): string {
  const pesos = Math.round(cents / 100);
  if (pesos >= 1_000_000) return `$${(pesos / 1_000_000).toFixed(1)}M`;
  if (pesos >= 1_000)     return `$${(pesos / 1_000).toFixed(0)}k`;
  return `$${pesos}`;
}

/* ── custom tooltips ─────────────────────────────────────────────────────── */

function OrdersTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm shadow-xl">
      <p className="mb-1 font-medium text-zinc-300">{label}</p>
      <p className="text-orange-400">
        <span className="font-bold">{payload[0].value}</span>{" "}
        <span className="text-zinc-400">órdenes</span>
      </p>
    </div>
  );
}

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm shadow-xl">
      <p className="mb-1 font-medium text-zinc-300">{label}</p>
      <p className="text-cyan-400 font-bold">{formatARS(payload[0].value)}</p>
    </div>
  );
}

/* ── summary cards ───────────────────────────────────────────────────────── */

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-zinc-500">{label}</p>
        <p className={`truncate text-base font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

/* ── main component ──────────────────────────────────────────────────────── */

export function SalesStatsPanel() {
  const [period, setPeriod]     = useState<Period>("week");
  const [data, setData]         = useState<SalesDataPoint[]>([]);
  const [summary, setSummary]   = useState<SalesSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchSales = useCallback(async (p: Period) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/stats/sales?period=${p}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Error ${res.status}`);
      }
      const json = await res.json();
      setData(json.data ?? []);
      setSummary(json.summary ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales(period);
  }, [period, fetchSales]);

  const hasData = data.some((d) => d.orders > 0);

  // X-axis tick reduction: show fewer labels when there are many data points
  const tickInterval = data.length > 20 ? 3 : data.length > 10 ? 1 : 0;

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base text-white sm:text-lg">
            <TrendingUp className="h-5 w-5 text-orange-400" />
            Estadísticas de Ventas
          </CardTitle>

          {/* Period selector */}
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriod(opt.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === opt.value
                    ? "bg-orange-500 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
          </div>
        ) : error ? (
          <div className="flex h-40 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            {summary && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SummaryCard
                  icon={ShoppingCart}
                  label={`Órdenes · ${summary.periodLabel}`}
                  value={String(summary.totalOrders)}
                  color="text-orange-400"
                />
                <SummaryCard
                  icon={TrendingUp}
                  label="Ingresos del período"
                  value={formatARS(summary.totalRevenue)}
                  color="text-cyan-400"
                />
                <SummaryCard
                  icon={Receipt}
                  label="Ticket promedio"
                  value={summary.avgTicket > 0 ? formatARS(summary.avgTicket) : "—"}
                  color="text-emerald-400"
                />
              </div>
            )}

            {!hasData ? (
              <div className="flex h-40 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40">
                <p className="text-sm text-zinc-500">
                  Sin ventas pagadas en este período
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {/* ── Órdenes ─────────────────────────────────────── */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Cantidad de órdenes
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#71717a", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        interval={tickInterval}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "#71717a", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<OrdersTooltip />} cursor={{ fill: "#3f3f46" }} />
                      <Bar
                        dataKey="orders"
                        fill="#f97316"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* ── Ingresos ────────────────────────────────────── */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Ingresos (ARS)
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}    />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#71717a", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        interval={tickInterval}
                      />
                      <YAxis
                        tickFormatter={formatARSShort}
                        tick={{ fill: "#71717a", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<RevenueTooltip />} cursor={{ stroke: "#3f3f46" }} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#22d3ee"
                        strokeWidth={2}
                        fill="url(#revenueGrad)"
                        dot={false}
                        activeDot={{ r: 4, fill: "#22d3ee", stroke: "#18181b", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
