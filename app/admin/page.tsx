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
      // Intentamos leer texto para loguear el error real (puede ser HTML/JSON)
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
        throw new Error(
          `/api/admin/products no devolvió un array. Tipo: ${typeof products}`
        );
      }

      if (!Array.isArray(orders)) {
        throw new Error(
          `/api/admin/orders no devolvió un array. Tipo: ${typeof orders}`
        );
      }

      // Debug útil: mirá la forma real de los objetos
      console.log("products sample:", products[0]);
      console.log("orders sample:", orders[0]);

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
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Error cargando datos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-zinc-300">
              El dashboard depende de:
              <span className="text-zinc-200"> /api/admin/products</span> y{" "}
              <span className="text-zinc-200">/api/admin/orders</span>.
              Si alguno devuelve 401/403/500 o no devuelve un array, queda vacío.
            </p>

            <pre className="text-xs text-red-300 whitespace-pre-wrap break-words bg-zinc-950 border border-zinc-800 rounded p-3">
              {errorMsg}
            </pre>

            <button
              onClick={fetchStats}
              className="px-4 py-2 rounded bg-orange-500 hover:bg-orange-600 text-white"
            >
              Reintentar
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Productos",
      value: stats.totalProducts,
      subtitle: `${stats.activeProducts} activos`,
      icon: Package,
      color: "text-blue-500",
    },
    {
      title: "Órdenes",
      value: stats.totalOrders,
      subtitle: `${stats.pendingOrders} pendientes`,
      icon: ShoppingCart,
      color: "text-green-500",
    },
    {
      title: "Ofertas Activas",
      value: stats.onSaleProducts,
      subtitle: "Productos en oferta",
      icon: Tag,
      color: "text-orange-500",
    },
    {
      title: "Destacados",
      value: stats.featuredProducts,
      subtitle: "Productos destacados",
      icon: TrendingUp,
      color: "text-purple-500",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  {stat.title}
                </CardTitle>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <p className="text-xs text-zinc-500 mt-1">{stat.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Resumen de Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Productos activos</span>
              <span className="font-bold text-white">{stats.activeProducts}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Productos inactivos</span>
              <span className="font-bold text-white">
                {stats.totalProducts - stats.activeProducts}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">En oferta</span>
              <span className="font-bold text-orange-500">{stats.onSaleProducts}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Destacados</span>
              <span className="font-bold text-purple-500">{stats.featuredProducts}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Resumen de Órdenes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Total de órdenes</span>
              <span className="font-bold text-white">{stats.totalOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Órdenes pendientes</span>
              <span className="font-bold text-yellow-500">{stats.pendingOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Órdenes completadas</span>
              <span className="font-bold text-green-500">
                {stats.totalOrders - stats.pendingOrders}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

