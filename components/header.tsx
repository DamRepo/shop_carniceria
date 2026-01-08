"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Menu,
  X,
  User,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { useCartStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const totalItems = useCartStore((state) => state?.getTotalItems?.());
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const cortesSub = [
    { href: '/cortes/carne', label: 'Carne' },
    { href: '/cortes/pollo', label: 'Pollo' },
    { href: '/cortes/cerdo', label: 'Cerdo' },
  ];
  const minimercadoSub = [
    { href: '/minimercado/despensa', label: 'Despensa' },
    { href: '/minimercado/bebidas', label: 'Bebidas' },
    { href: '/minimercado/lacteos', label: 'Lácteos' },
  ];
  
  

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = [
    { type: "link" as const, href: "/", label: "Inicio" },
    { type: "link" as const, href: "/ofertas", label: "Ofertas" },
    {
      type: "dropdown" as const,
      href: "/cortes",
      label: "Cortes",
      items: cortesSub,
    },
    { type: "link" as const, href: "/embutidos", label: "Embutidos" },
    {
      type: "dropdown" as const,
      href: "/minimercado",
      label: "Minimercado",
      items: minimercadoSub,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/90">
      <div className="container mx-auto max-w-7xl">
        <div className="flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <div className="relative h-16 w-16">
              <Image
                src="/logo-el-negro.png"
                alt="Carnicería El Negro"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-lg font-bold text-white">
                Carnicería El Negro
              </span>
              <span className="text-xs text-zinc-400">
                Fábrica de embutidos
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {menuItems.map((item) => {
              if (item.type === "link") {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      isActive(item.href)
                        ? "bg-primary/10 text-primary border-b-2 border-primary"
                        : "text-zinc-300 hover:text-white hover:bg-zinc-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              }

              // Dropdown (Cortes / Minimercado)
              return (
                <DropdownMenu key={item.href}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                        isActive(item.href)
                          ? "bg-primary/10 text-primary border-b-2 border-primary"
                          : "text-zinc-300 hover:text-white hover:bg-zinc-900"
                      }`}
                    >
                      {item.label}
                      <span className="text-xs opacity-80">▾</span>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="start"
                    className="w-56 bg-zinc-900 border-zinc-800"
                  >
                    {/* Link a la sección principal */}
                    <DropdownMenuItem
                      asChild
                      className="cursor-pointer text-zinc-300 focus:text-white focus:bg-zinc-800"
                    >
                      <Link href={item.href}>Ver todo</Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-zinc-800" />

                    {item.items.map((sub) => (
                      <DropdownMenuItem
                        key={sub.href}
                        asChild
                        className="cursor-pointer text-zinc-300 focus:text-white focus:bg-zinc-800"
                      >
                        <Link href={sub.href}>{sub.label}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </nav>

          {/* Right side: Auth + Cart */}
          <div className="flex items-center space-x-2">
            {/* Desktop Auth Links */}
            <div className="hidden md:flex items-center space-x-2">
              {status === "authenticated" && session ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <User className="h-4 w-4" />
                      <span>{session.user?.name || "Usuario"}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-zinc-900 border-zinc-800"
                  >
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium text-white">
                        {session.user?.name}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {session.user?.email}
                      </p>
                    </div>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    {session.user?.role === "ADMIN" && (
                      <>
                        <DropdownMenuItem
                          asChild
                          className="cursor-pointer text-zinc-300 focus:text-white focus:bg-zinc-800"
                        >
                          <Link href="/admin" className="flex items-center">
                            <LayoutDashboard className="h-4 w-4 mr-2" />
                            Dashboard Admin
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-zinc-800" />
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-zinc-800"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Cerrar Sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="ghost" size="sm">
                      <User className="h-4 w-4 mr-1" />
                      Login
                    </Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                    >
                      Registrarse
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Cart */}
            <Link href="/carrito">
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-zinc-900"
              >
                <ShoppingCart className="h-5 w-5" />
                {mounted && (totalItems ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-xs font-bold text-white flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden hover:bg-zinc-900"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-zinc-800 bg-black">
            <nav className="flex flex-col space-y-1 px-4 py-4">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-zinc-300 hover:text-white hover:bg-zinc-900"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="border-t border-zinc-800 my-2"></div>
              {status === "authenticated" && session ? (
                <>
                  <div className="px-4 py-2">
                    <p className="text-sm font-medium text-white">
                      {session.user?.name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {session.user?.email}
                    </p>
                  </div>
                  {session.user?.role === "ADMIN" && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-3 text-sm font-medium rounded-md transition-colors text-zinc-300 hover:text-white hover:bg-zinc-900 flex items-center"
                    >
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard Admin
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-medium rounded-md transition-colors text-red-400 hover:text-red-300 hover:bg-zinc-900 flex items-center"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar Sesión
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 text-sm font-medium rounded-md transition-colors text-zinc-300 hover:text-white hover:bg-zinc-900"
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 text-sm font-medium rounded-md transition-colors bg-primary text-white hover:bg-primary/90"
                  >
                    Registrarse
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
