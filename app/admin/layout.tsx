"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tag,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!session || session.user.role !== "ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-zinc-300">
        Redirigiendo...
      </div>
    );
  }

  const menuItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/productos", icon: Package, label: "Productos" },
    { href: "/admin/ofertas", icon: Tag, label: "Ofertas" },
    { href: "/admin/ordenes", icon: ShoppingCart, label: "Órdenes" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-zinc-900 border-r border-zinc-800">
        <div className="flex h-full flex-col">
          {/* Encabezado  */}
          <div className="shrink-0 mt-12 p-6 border-b border-zinc-800 flex items-center gap-3">
            {/* Avatar */}
            <div className="relative h-10 w-10 rounded-full overflow-hidden bg-zinc-700">
              <Image
                src="/avatar.png" 
                alt="Avatar"
                fill
                className="object-cover"
                sizes="40px"
                priority
              />
            </div>

            {/* Saludo dinámico */}
            <div className="flex flex-col">
              <p className="text-sm text-zinc-300">
                Hola{" "}
                <span className="font-semibold text-white">
                  {session.user.name ?? "Admin"}
                </span>
              </p>
              <p className="text-xs text-zinc-400">Carnicería El Negro</p>
            </div>
          </div>

          {/* Menu (ocupa el resto y scrollea si hace falta, así no pisa el encabezado) */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-orange-500 text-white"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info & Logout (fijo abajo, tampoco lo pisa el menú) */}
          <div className="shrink-0 p-4 border-t border-zinc-800">
            <div className="mb-3 px-4">
              <p className="text-sm font-medium text-white">{session.user.name}</p>
              <p className="text-xs text-zinc-400">{session.user.email}</p>
            </div>

            <Button
              onClick={() => signOut({ callbackUrl: "/" })}
              variant="outline"
              className="w-full justify-start gap-3 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}
