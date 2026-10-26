"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Coins } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Saldo de puntos del cliente logueado para el header. Con el flag apagado
 * (enabled=false, lo decide el layout en el servidor) no hace ningún pedido.
 * Se pide una vez por sesión, no en cada navegación.
 */
export function useHeaderPointsBalance(enabled: boolean): number | null {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || status !== "authenticated" || role !== "CUSTOMER") {
      setBalance(null);
      return;
    }
    let cancelled = false;
    fetch("/api/loyalty/points", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (cancelled) return;
        const value =
          typeof data === "object" && data !== null && "balance" in data && typeof data.balance === "number"
            ? data.balance
            : null;
        setBalance(value);
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, status, role]);

  return balance;
}

/** Indicador de puntos: solo si hay saldo. */
export function HeaderPointsBadge({ balance, className }: { balance: number | null; className?: string }) {
  if (balance === null || balance <= 0) return null;
  const label = balance.toLocaleString("es-AR");
  return (
    <Link
      href="/perfil#mis-puntos"
      aria-label={`Tenés ${label} ${balance === 1 ? "punto" : "puntos"}. Ver mis puntos`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-bone transition-colors hover:bg-iron",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <Coins className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
