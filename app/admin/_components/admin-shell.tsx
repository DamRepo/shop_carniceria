"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tag,
  FolderTree,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AvatarUpload } from "@/components/admin/AvatarUpload";

export function AdminShell({
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
      <div className="min-h-dvh flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!session || session.user?.role !== "ADMIN") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-black text-zinc-300">
        Redirigiendo...
      </div>
    );
  }

  const menuItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/productos", icon: Package, label: "Productos" },
    { href: "/admin/categorias", icon: FolderTree, label: "Categorías" },
    { href: "/admin/ofertas", icon: Tag, label: "Ofertas" },
    { href: "/admin/ordenes", icon: ShoppingCart, label: "Órdenes" },
  ];

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-zinc-900">
      <div className="shrink-0 mt-4 p-5 border-b border-zinc-800 flex items-center gap-3">
        <AvatarUpload size="sm" />

        <div className="flex flex-col">
          <p className="text-sm text-zinc-300">
            Hola{" "}
            <span className="font-semibold text-white">
              {session.user?.name ?? "Admin"}
            </span>
          </p>
          <p className="text-xs text-zinc-400">Carnicería El Negro</p>
        </div>
      </div>

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

      <div className="shrink-0 p-4 border-t border-zinc-800 space-y-2">
        <Link
          href="/admin/perfil"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors group"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {session.user?.name ?? "Admin"}
            </p>
            <p className="text-xs text-zinc-400 truncate">{session.user?.email ?? ""}</p>
          </div>
        </Link>

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
  );

  return (
    <div className="min-h-dvh bg-black text-white">
      <aside className="hidden md:block fixed inset-y-0 left-0 w-64 border-r border-zinc-800 bg-zinc-900">
        <SidebarContent />
      </aside>

      <div className="md:hidden sticky top-0 z-40 border-b border-zinc-800 bg-black/80 backdrop-blur">
        <div className="flex items-center gap-2 px-3 py-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent
              side="left"
              className="w-80 p-0 bg-zinc-900 border-zinc-800"
            >
              <SidebarContent />
            </SheetContent>
          </Sheet>

          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Admin</span>
            <span className="text-xs text-zinc-400">Carnicería El Negro</span>
          </div>
        </div>
      </div>

      <main className="md:ml-64 min-w-0">
        <div className="p-3 sm:p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}