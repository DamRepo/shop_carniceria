"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

// Misma clave que usaba el popup de exit-intent: se muestra una sola vez por sesión.
const SESSION_KEY = "exit_intent_shown";
const SHOW_DELAY_MS = 5000;

// Checkout y resultado de pago: el banner no se muestra nunca ahí
// (ni puede quedar encima de una confirmación de pago).
const EXCLUDED_PREFIXES = ["/checkout", "/orden-confirmada"];

function isExcluded(pathname: string | null) {
  return (
    !!pathname &&
    EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

/** Banner chico de ofertas, abajo a la izquierda. No bloquea la página. */
export function OffersBanner() {
  const pathname = usePathname();
  const excluded = isExcluded(pathname);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Entrar al checkout lo cierra del todo: no reaparece al volver.
    if (excluded) {
      setVisible(false);
      return;
    }

    let alreadyShown = true;
    try {
      alreadyShown = sessionStorage.getItem(SESSION_KEY) !== null;
    } catch {
      // Sin sessionStorage (modo privado estricto): no se muestra.
    }
    if (alreadyShown) return;

    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Si no se puede guardar, se muestra igual esta vez.
      }
      setVisible(true);
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [excluded]);

  if (!visible || excluded) return null;

  const close = () => setVisible(false);

  // Mobile: por encima de la fila de botones de WhatsApp/opinión (bottom-6, 56px de alto)
  // y con todo el ancho. Desde sm: abajo a la izquierda, lejos de esos botones.
  return (
    <div
      role="status"
      className="fixed bottom-24 left-4 z-40 max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-bottom-4 duration-300 sm:bottom-6 sm:left-6 sm:max-w-none"
    >
      <div className="flex items-center gap-2 rounded-full border border-border bg-card py-2 pl-4 pr-2 shadow-lg">
        <Link
          href="/ofertas"
          onClick={close}
          className="text-sm font-medium leading-tight text-foreground transition-colors hover:text-primary"
        >
          🔥 Mirá las ofertas de hoy
        </Link>
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
