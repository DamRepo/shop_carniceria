"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { cn } from "@/lib/utils";

/**
 * Saldo de puntos del cliente logueado para el header. No depende del flag:
 * el header también vive en páginas prerenderizadas en el build, donde un
 * valor pasado por el layout quedaría fijo hasta reconstruir. Se le pregunta
 * siempre a /api/loyalty/points, que lee el flag en cada request: con el flag
 * apagado responde 404 y no se muestra nada (igual ante cualquier error).
 * Se pide al montar el header, no en cada navegación.
 */
export function useHeaderPointsBalance(): number | null {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || role !== "CUSTOMER") {
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
  }, [status, role]);

  return balance;
}

/** Indicador compacto de puntos ("1.128 pts"): solo si hay saldo. */
export function HeaderPointsBadge({ balance, className }: { balance: number | null; className?: string }) {
  if (balance === null || balance <= 0) return null;
  const label = balance.toLocaleString("es-AR");
  return (
    <Link
      href="/perfil#mis-puntos"
      title="Puntos"
      aria-label={`${label} ${balance === 1 ? "punto" : "puntos"}`}
      className={cn(
        "inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap rounded-full px-2 py-1 leading-none text-bone",
        "bg-gradient-to-r from-blood/25 to-blood-dark/40 ring-1 ring-inset ring-blood/40",
        "transition-colors hover:from-blood/35 hover:to-blood-dark/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <span className="text-xs font-semibold tabular-nums">{label}</span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-bone/75">pts</span>
    </Link>
  );
}
