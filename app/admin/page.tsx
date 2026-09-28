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
  FolderTree,
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
      setLastUpdated(new Date());
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
      color: "text-sky-600",
      ring: "from-sky-500/10 to-transparent",
      href: "/admin/productos",
    },
    {
      title: "Órdenes",
      value: stats.totalOrders,
      subtitle: `${stats.pendingOrders} pendientes`,
      icon: ShoppingCart,
      color: "text-emerald-600",
      ring: "from-emerald-500/10 to-transparent",
      href: "/admin/ordenes",
    },
    {
      title: "Ofertas Activas",
      value: stats.onSaleProducts,
      subtitle: "Productos en oferta",
      icon: Tag,
      color: "text-primary",
      ring: "from-primary/10 to-transparent",
      href: "/admin/ofertas",
    },
    {
      title: "Destacados",
      value: stats.featuredProducts,
      subtitle: "Productos destacados",
      icon: TrendingUp,
      color: "text-fuchsia-600",
      ring: "from-fuchsia-500/10 to-transparent",
      href: "/admin/productos",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-b-transparent" />
          <p className="text-sm text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Hubo un problema al cargar la información
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/30 hover:bg-muted"
            >
              <House className="h-4 w-4" />
              Ir a inicio
            </Link>

            <button
              onClick={fetchStats}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </button>
          </div>
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg text-foreground">
              Error cargando datos
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              El dashboard depende de{" "}
              <span className="text-foreground">/api/admin/stats</span>.
            </p>

            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-muted p-3 text-xs text-destructive">
              {errorMsg}
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Panel administrativo
            </div>

            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                Dashboard
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                Resumen rápido del sistema y accesos principales
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/30 hover:bg-muted"
            >
              <House className="h-4 w-4" />
              Ir a inicio
            </Link>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Actualizando..." : "Actualizar"}
            </button>
          </div>

          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1 lg:mt-0 lg:text-right">
              Actualizado:{" "}
              {lastUpdated.toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;

          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="relative overflow-hidden border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/30 cursor-pointer">
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${stat.ring}`}
                />
                <CardHeader className="relative pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </CardTitle>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted">
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="relative">
                  <div className="text-3xl font-bold text-foreground sm:text-4xl">
                    {stat.value}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{stat.subtitle}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Estadísticas de ventas */}
      <SalesStatsPanel />

      {/* Bloques inferiores */}
      <div className="grid grid-cols-1 gap-3 sm:gap-6 xl:grid-cols-3">
        <Card className="border-border bg-card xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-foreground sm:text-lg">
              <Boxes className="h-5 w-5 text-primary" />
              Resumen de Productos
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm">
            <Row
              label="Productos activos"
              value={stats.activeProducts}
              valueClass="text-foreground"
            />
            <Row
              label="Productos inactivos"
              value={stats.totalProducts - stats.activeProducts}
              valueClass="text-foreground"
            />
            <Row
              label="En oferta"
              value={stats.onSaleProducts}
              valueClass="text-primary"
            />
            <Row
              label="Destacados"
              value={stats.featuredProducts}
              valueClass="text-fuchsia-600"
            />
          </CardContent>
        </Card>

        <Card className="border-border bg-card xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-foreground sm:text-lg">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
              Resumen de Órdenes
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm">
            <Row
              label="Total de órdenes"
              value={stats.totalOrders}
              valueClass="text-foreground"
            />
            <Row
              label="Órdenes pendientes"
              value={stats.pendingOrders}
              valueClass="text-amber-600"
            />
            <Row
              label="Órdenes no pendientes"
              value={stats.totalOrders - stats.pendingOrders}
              valueClass="text-emerald-600"
            />
          </CardContent>
        </Card>

        <Card className="border-border bg-card xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-foreground sm:text-lg">
              <Activity className="h-5 w-5 text-sky-600" />
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
              href="/admin/categorias"
              icon={FolderTree}
              title="Administrar categorías"
              subtitle="Crear, editar y organizar categorías"
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
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/60 px-3 py-2">
      <span className="truncate text-muted-foreground">{label}</span>
      <span className={`font-bold tabular-nums ${valueClass ?? "text-foreground"}`}>
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
      className="group flex items-center gap-3 rounded-xl border border-border bg-muted/70 p-3 transition hover:border-primary/30 hover:bg-muted"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card">
        <Icon className="h-5 w-5 text-primary" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </Link>
  );
}
