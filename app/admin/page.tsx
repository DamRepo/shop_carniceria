"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, Tag, TrendingUp } from "lucide-react";

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
      const [products, orders] = await Promise.all([
        fetchJsonOrThrow("/api/admin/products"),
        fetchJsonOrThrow("/api/admin/orders"),
      ]);

      if (!Array.isArray(products)) {
        throw new Error(`/api/admin/products no devolvió un array. Tipo: ${typeof products}`);
      }
      if (!Array.isArray(orders)) {
        throw new Error(`/api/admin/orders no devolvió un array. Tipo: ${typeof orders}`);
      }

      const totalProducts = products.length;
      const activeProducts = products.filter((p: any) => !!p?.isActive).length;
      const onSaleProducts = products.filter((p: any) => !!p?.isOnSale).length;
      const featuredProducts = products.filter((p: any) => !!p?.isFeatured).length;

      const totalOrders = orders.length;
      const pendingOrders = orders.filter((o: any) => o?.status === "PENDING").length;

      setStats({
        totalProducts,
        activeProducts,
        totalOrders,
        pendingOrders,
        onSaleProducts,
        featuredProducts,
      });
    } catch (err: any) {
      console.error("Error fetching stats:", err);
      setErrorMsg(err?.message || "Error desconocido al cargar estadísticas");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl sm:text-3xl font-bold">Dashboard</h1>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base sm:text-lg">Error cargando datos</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="text-sm text-zinc-300 leading-relaxed">
              El dashboard depende de: <span className="text-zinc-200">/api/admin/products</span> y{" "}
              <span className="text-zinc-200">/api/admin/orders</span>.
            </p>

            <pre className="text-xs text-red-300 whitespace-pre-wrap break-words bg-zinc-950 border border-zinc-800 rounded p-3 overflow-x-auto">
              {errorMsg}
            </pre>

            <button
              onClick={fetchStats}
              className="w-full sm:w-auto px-4 py-2 rounded bg-orange-500 hover:bg-orange-600 text-white"
            >
              Reintentar
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    { title: "Total Productos", value: stats.totalProducts, subtitle: `${stats.activeProducts} activos`, icon: Package, color: "text-blue-500" },
    { title: "Órdenes", value: stats.totalOrders, subtitle: `${stats.pendingOrders} pendientes`, icon: ShoppingCart, color: "text-green-500" },
    { title: "Ofertas Activas", value: stats.onSaleProducts, subtitle: "Productos en oferta", icon: Tag, color: "text-orange-500" },
    { title: "Destacados", value: stats.featuredProducts, subtitle: "Productos destacados", icon: TrendingUp, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-xs sm:text-sm text-zinc-400">Resumen rápido del sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <CardTitle className="text-sm font-medium text-zinc-400 truncate">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`w-5 h-5 shrink-0 ${stat.color}`} />
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{stat.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Resúmenes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base sm:text-lg">Resumen de Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Productos activos" value={stats.activeProducts} valueClass="text-white" />
            <Row label="Productos inactivos" value={stats.totalProducts - stats.activeProducts} valueClass="text-white" />
            <Row label="En oferta" value={stats.onSaleProducts} valueClass="text-orange-500" />
            <Row label="Destacados" value={stats.featuredProducts} valueClass="text-purple-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base sm:text-lg">Resumen de Órdenes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Total de órdenes" value={stats.totalOrders} valueClass="text-white" />
            <Row label="Órdenes pendientes" value={stats.pendingOrders} valueClass="text-yellow-500" />
            <Row label="Órdenes completadas" value={stats.totalOrders - stats.pendingOrders} valueClass="text-green-500" />
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
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-400 truncate">{label}</span>
      <span className={`font-bold tabular-nums ${valueClass ?? "text-white"}`}>{value}</span>
    </div>
  );
}