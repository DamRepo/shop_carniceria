warning: in the working copy of 'app/admin/productos/page.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'app/api/admin/products/[id]/route.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'prisma/schema.prisma', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/app/admin/layout.tsx b/app/admin/layout.tsx[m
[1mindex 6ce4d89..223d583 100644[m
[1m--- a/app/admin/layout.tsx[m
[1m+++ b/app/admin/layout.tsx[m
[36m@@ -1,158 +1,10 @@[m
[31m-"use client";[m
[31m-[m
[31m-import { useEffect } from "react";[m
[31m-import { useSession, signOut } from "next-auth/react";[m
[31m-import { useRouter, usePathname } from "next/navigation";[m
[31m-import Link from "next/link";[m
[31m-import Image from "next/image";[m
[31m-import {[m
[31m-  LayoutDashboard,[m
[31m-  Package,[m
[31m-  ShoppingCart,[m
[31m-  Tag,[m
[31m-  LogOut,[m
[31m-  Menu,[m
[31m-} from "lucide-react";[m
[31m-import { Button } from "@/components/ui/button";[m
[31m-import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";[m
[31m-[m
[31m-export default function AdminLayout({ children }: { children: React.ReactNode }) {[m
[31m-  const { data: session, status } = useSession();[m
[31m-  const router = useRouter();[m
[31m-  const pathname = usePathname();[m
[31m-[m
[31m-  useEffect(() => {[m
[31m-    if (status === "unauthenticated") {[m
[31m-      router.push("/auth/login");[m
[31m-    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {[m
[31m-      router.push("/");[m
[31m-    }[m
[31m-  }, [status, session, router]);[m
[31m-[m
[31m-  if (status === "loading") {[m
[31m-    return ([m
[31m-      <div className="min-h-dvh flex items-center justify-center bg-black">[m
[31m-        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />[m
[31m-      </div>[m
[31m-    );[m
[31m-  }[m
[31m-[m
[31m-  if (!session || session.user.role !== "ADMIN") {[m
[31m-    return ([m
[31m-      <div className="min-h-dvh flex items-center justify-center bg-black text-zinc-300">[m
[31m-        Redirigiendo...[m
[31m-      </div>[m
[31m-    );[m
[31m-  }[m
[31m-[m
[31m-  const menuItems = [[m
[31m-    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },[m
[31m-    { href: "/admin/productos", icon: Package, label: "Productos" },[m
[31m-    { href: "/admin/ofertas", icon: Tag, label: "Ofertas" },[m
[31m-    { href: "/admin/ordenes", icon: ShoppingCart, label: "Órdenes" },[m
[31m-  ];[m
[31m-[m
[31m-  const SidebarContent = () => ([m
[31m-    <div className="flex h-full flex-col bg-zinc-900">[m
[31m-      {/* Encabezado */}[m
[31m-      <div className="shrink-0 mt-12 p-6 border-b border-zinc-800 flex items-center gap-3">[m
[31m-        <div className="relative h-10 w-10 rounded-full overflow-hidden bg-zinc-700">[m
[31m-          <Image[m
[31m-            src="/avatar.png"[m
[31m-            alt="Avatar"[m
[31m-            fill[m
[31m-            className="object-cover"[m
[31m-            sizes="40px"[m
[31m-            priority[m
[31m-          />[m
[31m-        </div>[m
[31m-[m
[31m-        <div className="flex flex-col">[m
[31m-          <p className="text-sm text-zinc-300">[m
[31m-            Hola{" "}[m
[31m-            <span className="font-semibold text-white">[m
[31m-              {session.user.name ?? "Admin"}[m
[31m-            </span>[m
[31m-          </p>[m
[31m-          <p className="text-xs text-zinc-400">Carnicería El Negro</p>[m
[31m-        </div>[m
[31m-      </div>[m
[31m-[m
[31m-      {/* Menu */}[m
[31m-      <nav className="flex-1 overflow-y-auto p-4 space-y-2">[m
[31m-        {menuItems.map((item) => {[m
[31m-          const Icon = item.icon;[m
[31m-          const isActive = pathname === item.href;[m
[31m-[m
[31m-          return ([m
[31m-            <Link[m
[31m-              key={item.href}[m
[31m-              href={item.href}[m
[31m-              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${[m
[31m-                isActive[m
[31m-                  ? "bg-orange-500 text-white"[m
[31m-                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"[m
[31m-              }`}[m
[31m-            >[m
[31m-              <Icon className="w-5 h-5" />[m
[31m-              <span>{item.label}</span>[m
[31m-            </Link>[m
[31m-          );[m
[31m-        })}[m
[31m-      </nav>[m
[31m-[m
[31m-      {/* Logout */}[m
[31m-      <div className="shrink-0 p-4 border-t border-zinc-800">[m
[31m-        <div className="mb-3 px-4">[m
[31m-          <p className="text-sm font-medium text-white">{session.user.name}</p>[m
[31m-          <p className="text-xs text-zinc-400">{session.user.email}</p>[m
[31m-        </div>[m
[31m-[m
[31m-        <Button[m
[31m-          onClick={() => signOut({ callbackUrl: "/" })}[m
[31m-          variant="outline"[m
[31m-          className="w-full justify-start gap-3 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"[m
[31m-        >[m
[31m-          <LogOut className="w-4 h-4" />[m
[31m-          Cerrar Sesión[m
[31m-        </Button>[m
[31m-      </div>[m
[31m-    </div>[m
[31m-  );[m
[31m-[m
[31m-  return ([m
[31m-    <div className="min-h-dvh bg-black text-white">[m
[31m-      {/* Sidebar desktop (solo md+) */}[m
[31m-      <aside className="hidden md:block fixed inset-y-0 left-0 w-64 border-r border-zinc-800 bg-zinc-900">[m
[31m-        <SidebarContent />[m
[31m-      </aside>[m
[31m-[m
[31m-      {/* Topbar mobile */}[m
[31m-      <div className="md:hidden sticky top-0 z-40 border-b border-zinc-800 bg-black/80 backdrop-blur">[m
[31m-        <div className="flex items-center gap-2 px-3 py-2">[m
[31m-          <Sheet>[m
[31m-            <SheetTrigger asChild>[m
[31m-              <Button variant="ghost" size="icon" className="text-white">[m
[31m-                <Menu className="h-5 w-5" />[m
[31m-              </Button>[m
[31m-            </SheetTrigger>[m
[31m-[m
[31m-            <SheetContent side="left" className="w-80 p-0 bg-zinc-900 border-zinc-800">[m
[31m-              <SidebarContent />[m
[31m-            </SheetContent>[m
[31m-          </Sheet>[m
[31m-[m
[31m-          <div className="flex flex-col leading-tight">[m
[31m-            <span className="text-sm font-semibold">Admin</span>[m
[31m-            <span className="text-xs text-zinc-400">Carnicería El Negro</span>[m
[31m-          </div>[m
[31m-        </div>[m
[31m-      </div>[m
[31m-[m
[31m-      {/* Main Content */}[m
[31m-      <main className="md:ml-64 min-w-0">[m
[31m-        <div className="p-3 sm:p-6 lg:p-8">{children}</div>[m
[31m-      </main>[m
[31m-    </div>[m
[31m-  );[m
[32m+[m[32mimport type { ReactNode } from "react";[m
[32m+[m[32mimport { AdminShell } from "./_components/admin-shell";[m
[32m+[m
[32m+[m[32mexport default function AdminLayout({[m
[32m+[m[32m  children,[m
[32m+[m[32m}: {[m
[32m+[m[32m  children: ReactNode;[m
[32m+[m[32m}) {[m
[32m+[m[32m  return <AdminShell>{children}</AdminShell>;[m
 }[m
\ No newline at end of file[m
[1mdiff --git a/app/admin/ordenes/page.tsx b/app/admin/ordenes/page.tsx[m
[1mindex c6e0778..d3239f3 100644[m
[1m--- a/app/admin/ordenes/page.tsx[m
[1m+++ b/app/admin/ordenes/page.tsx[m
[36m@@ -9,7 +9,7 @@[m [mimport {[m
   SelectTrigger,[m
   SelectValue,[m
 } from '@/components/ui/select';[m
[31m-import { Clock, CheckCircle, XCircle, Package } from 'lucide-react';[m
[32m+[m[32mimport { Clock, CheckCircle, XCircle, Package, CalendarDays, StickyNote } from 'lucide-react';[m
 import { formatPrice } from '@/lib/utils-format';[m
 import { toast } from 'sonner';[m
 [m
[36m@@ -27,11 +27,15 @@[m [minterface Order {[m
   deliveryMethod: DeliveryMethod;[m
   address: string | null;[m
 [m
[32m+[m[32m  pickupDate: string | null;[m
[32m