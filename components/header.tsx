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
  Search,
} from "lucide-react";
import { useCartStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

type MenuItem =
  | { type: "link"; href: string; label: string }
  | {
      type: "dropdown";
      href: string;
      label: string;
      items: { href: string; label: string }[];
    };

type SearchProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
};

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function Header() {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const totalItems = useCartStore((state) => state?.getTotalItems?.());
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // -----------------------
  // Submenús
  // -----------------------
  const cortesSub = [
    { href: "/cortes/carne", label: "Carne" },
    { href: "/cortes/pollo", label: "Pollo" },
    { href: "/cortes/cerdo", label: "Cerdo" },
  ];

  const minimercadoSub = [
    { href: "/minimercado/despensa", label: "Despensa" },
    { href: "/minimercado/bebidas", label: "Bebidas" },
    { href: "/minimercado/lacteos", label: "Lácteos" },
  ];

  // -----------------------
  // Menú nuevo (sin Inicio)
  // -----------------------
  const menuItems: MenuItem[] = [
    { type: "dropdown", href: "/cortes", label: "Cortes", items: cortesSub },
    {
      type: "dropdown",
      href: "/minimercado",
      label: "Minimercado",
      items: minimercadoSub,
    },
    { type: "link", href: "/ofertas", label: "Ofertas" },
    { type: "link", href: "/embutidos", label: "Embutidos" },
    { type: "link", href: "/sobre-nosotros", label: "Sobre nosotros" },
    {
      type: "link",
      href: "/preguntas-frecuentes",
      label: "Preguntas frecuentes",
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // -----------------------
  // Buscador
  // -----------------------
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState<SearchProduct[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setSearchLoading(false);
      return;
    }

    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setSearchLoading(true);
      try {
        const res = await fetch(
          `/api/search/products?q=${encodeURIComponent(query)}`,
          {
            cache: "no-store",
            signal: ac.signal,
          }
        );
        const data = await safeJson<SearchProduct[]>(res);
        setResults(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (e?.name !== "AbortError") setResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [q]);

  function closeSearch() {
    setSearchOpen(false);
  }

  const showDropdown = searchOpen && q.trim().length >= 2;

  // Mobile dropdown toggles
  const [mobileCortesOpen, setMobileCortesOpen] = useState(false);
  const [mobileMiniOpen, setMobileMiniOpen] = useState(false);

  // Click afuera para cerrar dropdown (desktop)
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const el = searchBoxRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      closeSearch();
    }
    if (!showDropdown) return;
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showDropdown]);

  // Escape para cerrar dropdown
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeSearch();
    }
    if (!showDropdown) return;
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showDropdown]);

  return (
    <header className="sticky top-0 z-50 w-full bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/90">
      {/* FILA 1: Negro (logo + search + auth/cart) */}
      <div className="border-b border-zinc-800 shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_260px] items-center gap-3 py-2">
            {/* Marca */}
            <Link
              href="/"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="relative h-12 w-12 sm:h-16 sm:w-16 shrink-0">
                <Image
                  src="/logo-el-negro.png"
                  alt="Carnicería El Negro"
                  fill
                  className="object-contain"
                  priority
                />
              </div>

              <div className="flex flex-col leading-tight">
                <span className="text-[13px] sm:text-sm font-semibold text-white">
                  Carnicería El Negro
                </span>
                <span className="text-[10px] sm:text-[11px] text-zinc-400">
                  Fábrica de embutidos
                </span>
              </div>
            </Link>

            {/* Buscador (desktop) */}
            <div className="hidden lg:block" ref={searchBoxRef}>
              <div className="relative max-w-3xl mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Buscar productos..."
                  className="pl-9 h-10 bg-zinc-950/40 border-zinc-800 text-zinc-200 placeholder:text-zinc-500"
                />

                {showDropdown && (
                  <div
                    className="absolute mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <div className="px-3 py-2 text-xs text-zinc-400 border-b border-zinc-800">
                      {searchLoading
                        ? "Buscando..."
                        : results.length > 0
                        ? `${results.length} resultado(s)`
                        : "Sin resultados"}
                    </div>

                    <div className="max-h-80 overflow-auto">
                      {results.map((p) => (
                        <Link
                          key={p.id}
                          href={`/productos/${p.slug}`}
                          onClick={closeSearch}
                          className="flex items-center gap-3 px-3 py-3 hover:bg-zinc-900 transition-colors"
                        >
                          <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden relative shrink-0">
                            {p.image ? (
                              <Image
                                src={p.image}
                                alt={p.name}
                                fill
                                className="object-cover"
                              />
                            ) : null}
                          </div>

                          <div className="min-w-0">
                            <div className="text-sm font-medium text-zinc-100 truncate">
                              {p.name}
                            </div>
                            <div className="text-xs text-zinc-400 truncate">
                              {p.slug}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>

                    <div className="px-3 py-2 border-t border-zinc-800 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-300 hover:bg-zinc-900 hover:text-red-400"
                        onClick={closeSearch}
                        type="button"
                      >
                        Cerrar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Derecha: Auth + Carrito + Mobile */}
            <div className="flex items-center justify-end gap-2">
              {/* Desktop Auth */}
              <div className="hidden md:flex items-center space-x-2">
                {status === "authenticated" && session ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 hover:bg-zinc-900 text-zinc-200"
                      >
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
                            className="cursor-pointer text-zinc-300 focus:text-white focus:bg-zinc-800 hover:text-red-400"
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-zinc-900 text-zinc-200"
                      >
                        <User className="h-4 w-4 mr-1" />
                        Login
                      </Button>
                    </Link>
                    <Link href="/auth/register">
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Registrarse
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Carrito */}
              <Link href="/carrito">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative hover:bg-zinc-900 text-zinc-200"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {mounted && (totalItems ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 text-xs font-bold text-white flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </Button>
              </Link>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden hover:bg-zinc-900 text-zinc-200"
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

          {/* Buscador (mobile / tablet) */}
          <div className="lg:hidden pb-2" ref={searchBoxRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Buscar productos..."
                className="pl-9 h-10 bg-zinc-950/40 border-zinc-800 text-zinc-200 placeholder:text-zinc-500"
              />

              {showDropdown && (
                <div
                  className="absolute mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden z-50"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="px-3 py-2 text-xs text-zinc-400 border-b border-zinc-800">
                    {searchLoading
                      ? "Buscando..."
                      : results.length > 0
                      ? `${results.length} resultado(s)`
                      : "Sin resultados"}
                  </div>

                  <div className="max-h-80 overflow-auto">
                    {results.map((p) => (
                      <Link
                        key={p.id}
                        href={`/productos/${p.slug}`}
                        onClick={closeSearch}
                        className="flex items-center gap-3 px-3 py-3 hover:bg-zinc-900 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden relative shrink-0">
                          {p.image ? (
                            <Image
                              src={p.image}
                              alt={p.name}
                              fill
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-zinc-100 truncate">
                            {p.name}
                          </div>
                          <div className="text-xs text-zinc-400 truncate">
                            {p.slug}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div className="px-3 py-2 border-t border-zinc-800 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-300 hover:bg-zinc-900 hover:text-red-400"
                      onClick={closeSearch}
                      type="button"
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FILA 2: Menú en franja gris FULL WIDTH */}
      <div className="bg-zinc-900/70 border-b border-zinc-800">
        <div className="container mx-auto max-w-7xl px-4">
          <nav className="hidden lg:flex items-center justify-center gap-2 py-2 flex-wrap">
            {menuItems.map((item) => {
              const active = isActive(item.href);

              if (item.type === "link") {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                      active
                        ? "bg-red-500/10 text-red-400 border-b-2 border-red-500"
                        : "text-zinc-200 hover:text-red-400 hover:bg-zinc-800/60",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              }

              return (
                <DropdownMenu key={item.href}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={[
                        "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap",
                        active
                          ? "bg-red-500/10 text-red-400 border-b-2 border-red-500"
                          : "text-zinc-200 hover:text-red-400 hover:bg-zinc-800/60",
                      ].join(" ")}
                    >
                      {item.label}
                      <span className="text-xs opacity-80">▾</span>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="start"
                    className="w-56 bg-zinc-900 border-zinc-800"
                  >
                    <DropdownMenuItem
                      asChild
                      className="cursor-pointer text-zinc-300 focus:text-white focus:bg-zinc-800 hover:text-red-400"
                    >
                      <Link href={item.href}>Ver todo</Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-zinc-800" />

                    {item.items.map((sub) => (
                      <DropdownMenuItem
                        key={sub.href}
                        asChild
                        className="cursor-pointer text-zinc-300 focus:text-white focus:bg-zinc-800 hover:text-red-400"
                      >
                        <Link href={sub.href}>{sub.label}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </nav>

          {/* Mobile menu (franja gris) */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-zinc-800 py-2">
              {/* Poné acá tu mobile menu tal cual lo tenías */}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
