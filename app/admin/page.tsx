"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const SalesStatsPanel = dynamic(
  () => import("./_components/SalesStatsPanel").then((m) => m.SalesStatsPanel),
  { ssr: false }
);
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Package,
  ShoppingCart,
  Tag,
  TrendingUp,
  House,
  RefreshCw,
  Boxes,
  ClipboardList,
  Sparkles,
  Activity,
} from "lucide-react";

interface Stats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  onSaleProducts: number;
  featuredProducts: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    onSaleProducts: 0,
    featuredProducts: 0,
  });

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchJsonOrThrow = async (url: string) => {
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${url} -> ${res.status} ${res.statusText} ${text}`);
    }

    return res.json();
  };

  const fetchStats = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const data = await fetchJsonOrThrow("/api/admin/stats");

      if (typeof data?.totalProducts !== "number") {
        throw new Error(
          `/api/admin/stats devolvió una respuesta inesperada. Tipo: ${typeof data}`
        );
      }

      setStats({
        totalProducts: data.totalProducts,
        activeProducts: data.activeProducts,
        totalOrders: data.totalOrders,
        pendingOrders: data.pendingOrders,
        onSaleProducts: data.onSaleProducts,
        featuredProducts: data.featuredProducts,
      });
    } catch (err: any) {
      console.error("Error fetching stats:", err);
      setErrorMsg(err?.message || "Error desconocido al cargar estadísticas");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchStats();
    } finally {
      setRefreshing(false);
    }
  };

  const statCards = [
    {
      title: "Total Productos",
      value: stats.totalProducts,
      subtitle: `${stats.activeProducts} activos`,
      icon: Package,
      color: "text-sky-400",
      ring: "from-sky-500/20 to-transparent",
    },
    {
      title: "Órdenes",
      value: stats.totalOrders,
      subtitle: `${stats.pendingOrders} pendientes`,
      icon: ShoppingCart,
      color: "text-emerald-400",
      ring: "from-emerald-500/20 to-transparent",
    },
    {
      title: "Ofertas Activas",
      value: stats.onSaleProducts,
      subtitle: "Productos en oferta",
      icon: Tag,
      color: "text-orange-400",
      ring: "from-orange-500/20 to-transparent",
    },
    {
      title: "Destacados",
      value: stats.featuredProducts,
      subtitle: "Productos destacados",
      icon: TrendingUp,
      color: "text-fuchsia-400",
      ring: "from-fuchsia-500/20 to-transparent",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-b-transparent" />
          <p className="text-sm text-zinc-400">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Dashboard
            </h1>
            <p className="text-sm text-zinc-400">
              Hubo un problema al cargar la información
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:border-zinc-700 hover:bg-zinc-800"
            >
              <House className="h-4 w-4" />
              Ir a inicio
            </Link>

            <button
              onClick={fetchStats}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </button>
          </div>
        </div>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg text-white">
              Error cargando datos
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-zinc-300">
              El dashboard depende de{" "}
              <span className="text-zinc-100">/api/admin/stats</span>.
            </p>

            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-red-300">
              {errorMsg}
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-300">
              <Sparkles className="h-3.5 w-3.5" />
              Panel administrativo
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                Dashboard
              </h1>
              <p className="text-sm text-zinc-400 sm:text-base">
                Resumen rápido del sistema y accesos principales
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:border-zinc-700 hover:bg-zinc-800"
            >
              <House className="h-4 w-4" />
              Ir a inicio
            </Link>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card
              key={stat.title}
              className="relative overflow-hidden border-zinc-800 bg-zinc-900/95 transition hover:-translate-y-0.5 hover:border-zinc-700"
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${stat.ring}`}
              />
              <CardHeader className="relative pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-sm font-medium text-zinc-400">
                      {stat.title}
                    </CardTitle>
                  </div>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="relative">
                <div className="text-3xl font-bold text-white sm:text-4xl">
                  {stat.value}
                </div>
                <p className="mt-2 text-xs text-zinc-500">{stat.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Estadísticas de ventas */}
      <SalesStatsPanel />

      {/* Bloques inferiores */}
      <div className="grid grid-cols-1 gap-3 sm:gap-6 xl:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900 xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-white sm:text-lg">
              <Boxes className="h-5 w-5 text-orange-400" />
              Resumen de Productos
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm">
            <Row
              label="Productos activos"
              value={stats.activeProducts}
              valueClass="text-white"
            />
            <Row
              label="Productos inactivos"
              value={stats.totalProducts - stats.activeProducts}
              valueClass="text-white"
            />
            <Row
              label="En oferta"
              value={stats.onSaleProducts}
              valueClass="text-orange-400"
            />
            <Row
              label="Destacados"
              value={stats.featuredProducts}
              valueClass="text-fuchsia-400"
            />
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900 xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-white sm:text-lg">
              <ClipboardList className="h-5 w-5 text-emerald-400" />
              Resumen de Órdenes
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm">
            <Row
              label="Total de órdenes"
              value={stats.totalOrders}
              valueClass="text-white"
            />
            <Row
              label="Órdenes pendientes"
              value={stats.pendingOrders}
              valueClass="text-yellow-400"
            />
            <Row
              label="Órdenes no pendientes"
              value={stats.totalOrders - stats.pendingOrders}
              valueClass="text-emerald-400"
            />
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900 xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-white sm:text-lg">
              <Activity className="h-5 w-5 text-sky-400" />
              Accesos rápidos
            </CardTitle>
          </CardHeader>

          <CardContent className="grid grid-cols-1 gap-3">
            <QuickLink
              href="/admin/productos"
              icon={Package}
              title="Administrar productos"
              subtitle="Crear, editar y activar productos"
            />
            <QuickLink
              href="/admin/ordenes"
              icon={ShoppingCart}
              title="Ver órdenes"
              subtitle="Controlar compras y estados"
            />
            <QuickLink
              href="/"
              icon={House}
              title="Volver al inicio"
              subtitle="Ir a la tienda pública"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
      <span className="truncate text-zinc-400">{label}</span>
      <span className={`font-bold tabular-nums ${valueClass ?? "text-white"}`}>
        {value}
      </span>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 transition hover:border-zinc-700 hover:bg-zinc-950"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
        <Icon className="h-5 w-5 text-orange-400" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        <p className="truncate text-xs text-zinc-500">{subtitle}</p>
      </div>
    </Link>
  );
}