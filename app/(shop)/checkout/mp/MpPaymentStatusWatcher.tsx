"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type MpCheckoutState = "paid" | "paid_on_cancelled" | "failed" | "pending";

type StatusResponse = { state: MpCheckoutState; orderNumber: string | null };

// Pantalla de fallo: casi nunca cambia, así que el polling es acotado.
const FAST_POLL_MS = 5000;
const SLOW_POLL_MS = 15000;
const FAST_PHASE_MS = 60 * 1000;
const MAX_POLL_MS = 10 * 60 * 1000;
// Mismo criterio que checkout/talo/pending: número del footer como respaldo.
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5493458556104";

function isPaid(state: MpCheckoutState | null) {
  return state === "paid" || state === "paid_on_cancelled";
}

/**
 * Pantalla de "pago no completado" que se corrige sola si el pago termina
 * acreditándose (webhook tardío, o aprobado sobre una orden ya cancelada).
 */
export function MpPaymentStatusWatcher({
  csId,
  failedTitle,
  details,
}: {
  csId: string | null;
  failedTitle: string;
  details?: ReactNode;
}) {
  const [state, setState] = useState<MpCheckoutState | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pollKey, setPollKey] = useState(0);

  useEffect(() => {
    if (!csId) return;
    const id = csId;

    let cancelled = false;
    let finished = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();

    async function fetchStatus(): Promise<boolean> {
      try {
        const res = await fetch(`/api/checkout/mp/${encodeURIComponent(id)}/status`, { cache: "no-store" });
        if (cancelled) return true;
        // 404: no hay orden para este csId, seguir consultando no cambia nada.
        if (!res.ok) return res.status === 404;

        const json = (await res.json()) as StatusResponse;
        if (cancelled) return true;
        setState(json.state);
        setOrderNumber(json.orderNumber);
        return isPaid(json.state);
      } catch (e) {
        console.error("mp status: error consultando estado:", e);
        return false;
      }
    }

    function schedule() {
      if (cancelled || finished || document.hidden) return;
      const elapsed = Date.now() - startedAt;
      if (elapsed >= MAX_POLL_MS) {
        setStopped(true);
        return;
      }
      timer = setTimeout(tick, elapsed < FAST_PHASE_MS ? FAST_POLL_MS : SLOW_POLL_MS);
    }

    async function tick() {
      timer = null;
      finished = await fetchStatus();
      schedule();
    }

    // Pestaña oculta: no se consulta. Al volver, una consulta inmediata
    // (cubre al cliente que fue a mirar la app de MP y volvió).
    function onVisibilityChange() {
      if (cancelled || finished) return;
      if (timer) clearTimeout(timer);
      timer = null;
      if (!document.hidden) tick();
    }

    async function start() {
      setStopped(false);
      setChecking(true);
      // Una sola consulta directa a MP (el endpoint tiene rate limit): detecta el
      // aprobado aunque el webhook todavía no haya llegado. Después solo se lee la base.
      try {
        await fetch("/api/mercadopago/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csId: id }),
        });
      } catch {
        // Si falla, igual se lee el estado desde la base.
      }
      if (cancelled) return;
      setChecking(false);
      tick();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    start();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [csId, pollKey]);

  const paid = isPaid(state);
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hola, tuve un problema con el pago de mi pedido${orderNumber ? ` ${orderNumber}` : ""} (Mercado Pago).`
  )}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{paid ? "Tu pago se acreditó ✅" : failedTitle}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {details}

        {paid ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Hubo un problema con tu pago, pero ya se acreditó. No te preocupes, te vamos a
              contactar para coordinar tu pedido.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-green-600 text-white hover:bg-green-700">
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Abrir WhatsApp">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Escribinos por WhatsApp
                </a>
              </Button>
              <Link href="/mis-compras">
                <Button variant="outline">Ver mis compras</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Hubo un problema con tu pago. No te preocupes, si ya te cobramos te vamos a
              contactar para resolverlo.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/checkout">
                <Button>Reintentar</Button>
              </Link>
              <Link href="/carrito">
                <Button variant="outline">Volver al carrito</Button>
              </Link>
              {csId && stopped ? (
                <Button variant="outline" onClick={() => setPollKey((k) => k + 1)} disabled={checking}>
                  {checking ? "Verificando..." : "Actualizar estado"}
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
