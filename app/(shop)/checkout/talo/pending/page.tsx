"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Copy,
  Landmark,
  Loader2,
  MessageCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCartStore } from "@/lib/store";
import { useCheckoutStore } from "@/lib/checkout-store";
import { formatPrice } from "@/lib/utils-format";

const POLL_INTERVAL_MS = 5000;
// Misma fuente que el botón flotante (components/whatsapp-button.tsx), con el
// número del footer como respaldo para que el link nunca quede vacío.
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5493458556104";

type TaloStatusResponse = {
  status: "WAITING_TALO" | "PENDING" | "APPROVED" | "FAILED" | "EXPIRED";
  taloStatus: string | null;
  cvu: string | null;
  alias: string | null;
  expiresAt: string | null;
  total: number; // centavos — se muestra con formatPrice()
  orderId: string | null;
  orderNumber: string | null;
  orderStatus: string | null;
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2.5">
        <span className="flex-1 truncate font-mono text-sm font-semibold">{value}</span>
        <button
          type="button"
          aria-label={`Copiar ${label}`}
          onClick={() => {
            navigator.clipboard.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className="shrink-0 rounded-lg p-1 transition-colors hover:bg-muted"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}

function useCountdown(expiresAt: string | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return useMemo(() => {
    if (!expiresAt) return null;
    const diffMs = new Date(expiresAt).getTime() - now;
    if (diffMs <= 0) return { expired: true, text: "Vencido" };

    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

    if (days > 0) return { expired: false, text: `${days}d ${hours}h` };
    if (hours > 0) return { expired: false, text: `${hours}h ${minutes}m` };

    const seconds = Math.floor((diffMs % (60 * 1000)) / 1000);
    return { expired: false, text: `${minutes}m ${seconds}s` };
  }, [expiresAt, now]);
}

function TaloPendingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const csId = searchParams.get("csId");

  const clearCart = useCartStore((s) => s.clearCart);
  const clearCheckout = useCheckoutStore((s) => s.clear);

  const [data, setData] = useState<TaloStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cartCleared, setCartCleared] = useState(false);

  useEffect(() => {
    if (!csId) return;

    let cancelled = false;

    let timer: ReturnType<typeof setTimeout> | null = null;

    async function fetchStatus() {
      try {
        const res = await fetch(`/api/checkout/talo/${csId}/status`, { cache: "no-store" });
        if (cancelled) return;

        if (res.status === 404) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const json = (await res.json()) as TaloStatusResponse;
        if (cancelled) return;
        setData(json);
        setLoading(false);

        const isTerminal =
          json.status === "APPROVED" ||
          json.status === "FAILED" ||
          json.status === "EXPIRED" ||
          json.orderStatus === "CANCELLED";

        if (!isTerminal) {
          timer = setTimeout(fetchStatus, POLL_INTERVAL_MS);
        }
      } catch (e) {
        console.error("talo pending: error consultando estado:", e);
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(fetchStatus, POLL_INTERVAL_MS);
        }
      }
    }

    fetchStatus();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [csId]);

  useEffect(() => {
    if (data?.status === "APPROVED" && !cartCleared) {
      setCartCleared(true);
      clearCart?.();
      clearCheckout?.();
    }
  }, [data?.status, cartCleared, clearCart, clearCheckout]);

  const countdown = useCountdown(data?.expiresAt ?? null);

  if (!csId || notFound) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>No encontramos tu pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              El link de pago no es válido o ya expiró. Contactanos por WhatsApp si ya realizaste la transferencia.
            </p>
            <Button asChild>
              <a href="/checkout/metodo-pago">Volver a método de pago</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="container mx-auto flex max-w-xl items-center justify-center px-4 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (data?.status === "APPROVED") {
    return (
      <div className="container mx-auto max-w-xl px-4 py-10">
        <Card className="overflow-hidden rounded-3xl border-border/60 shadow-sm">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500 text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">¡Pago confirmado!</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5 md:p-6">
            {data.orderNumber && (
              <p className="text-sm">
                Pedido: <b>{data.orderNumber}</b>
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Recibimos tu transferencia. Ya estamos preparando tu pedido.
            </p>
            <Button asChild className="w-full">
              <a href={`/orden-confirmada?orderNumber=${data.orderNumber ?? ""}&orderId=${data.orderId ?? ""}`}>
                Ver confirmación
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data?.status === "FAILED" || data?.status === "EXPIRED") {
    return (
      <div className="container mx-auto max-w-xl px-4 py-10">
        <Card className="overflow-hidden rounded-3xl border-border/60 shadow-sm">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive text-destructive-foreground">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">
                {data.status === "EXPIRED" ? "El pago venció" : "No pudimos confirmar el pago"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5 md:p-6">
            <p className="text-sm text-muted-foreground">
              {data.status === "EXPIRED"
                ? "El tiempo para transferir venció y liberamos tu reserva. Podés volver a intentarlo."
                : "Hubo un problema con tu pago. Podés intentar de nuevo o elegir otro método."}
            </p>
            <Button className="w-full" onClick={() => router.push("/checkout/metodo-pago")}>
              Volver a método de pago
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // El admin canceló la orden mientras el cliente esperaba: la sesión sigue en
  // WAITING_TALO/PENDING, pero ya no hay que mostrar el CVU/alias.
  if (data?.orderStatus === "CANCELLED") {
    const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      `Hola, mi pedido ${data.orderNumber ?? ""} (transferencia) figura como cancelado.`
    )}`;

    return (
      <div className="container mx-auto max-w-xl px-4 py-10">
        <Card className="overflow-hidden rounded-3xl border-border/60 shadow-sm">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive text-destructive-foreground">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">Este pedido fue cancelado</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5 md:p-6">
            {data.orderNumber && (
              <p className="text-sm">
                Pedido: <b>{data.orderNumber}</b>
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Si ya hiciste la transferencia, contactanos por WhatsApp antes de volver a intentarlo.
            </p>
            <Button asChild className="w-full bg-green-600 text-white hover:bg-green-700">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Abrir WhatsApp">
                <MessageCircle className="mr-2 h-4 w-4" />
                Escribinos por WhatsApp
              </a>
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push("/checkout/metodo-pago")}>
              Volver a método de pago
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // WAITING_TALO / PENDING
  return (
    <div className="container mx-auto max-w-xl px-4 py-8 md:py-12">
      <button
        type="button"
        onClick={() => router.push("/checkout/metodo-pago")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver
      </button>

      <Card className="overflow-hidden rounded-3xl border-border/60 shadow-sm">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Realizá tu transferencia</CardTitle>
              <p className="text-sm text-muted-foreground">
                Apenas la recibamos, confirmamos tu pedido automáticamente
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-5 md:p-6">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="mb-1 text-sm text-muted-foreground">Monto a transferir</p>
            <p className="text-3xl font-bold text-primary">{formatPrice(data?.total ?? 0)}</p>
          </div>

          {data?.cvu && (
            <div className="space-y-3 rounded-2xl border bg-background p-4">
              <p className="text-sm font-semibold">Datos para la transferencia</p>
              <CopyField label="CVU" value={data.cvu} />
              {data.alias && <CopyField label="Alias" value={data.alias} />}
            </div>
          )}

          {data?.cvu && (
            <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <p className="text-sm font-medium text-blue-800">
                Una vez que hagas la transferencia, esperá unos segundos: confirmamos tu pago
                automáticamente.
              </p>
            </div>
          )}

          {countdown && (
            <div
              className={
                countdown.expired
                  ? "rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-center text-sm font-medium text-destructive"
                  : "rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-center text-sm font-medium"
              }
            >
              {countdown.expired ? "El tiempo para pagar venció" : `Vence en ${countdown.text}`}
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Esperando confirmación de la transferencia...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TaloPendingPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex max-w-xl items-center justify-center px-4 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <TaloPendingContent />
    </Suspense>
  );
}
