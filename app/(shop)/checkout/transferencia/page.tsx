"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  Copy,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCartStore } from "@/lib/store";
import { useCheckoutStore } from "@/lib/checkout-store";
import { TRANSFER_INFO } from "@/lib/transfer-info";
import { formatPrice } from "@/lib/utils-format";
import { toast } from "sonner";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2.5">
        <span className="flex-1 truncate font-mono text-sm font-semibold">
          {value}
        </span>
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

export default function TransferenciaPage() {
  const router = useRouter();
  const { formData, totals, clear: clearCheckout } = useCheckoutStore();
  const items = useCartStore((s) => s?.items);
  const [submitting, setSubmitting] = useState(false);
  const navigatingRef = useRef(false);

  useEffect(() => {
    if (navigatingRef.current) return;
    if (!formData || !totals) {
      router.replace("/checkout");
    }
  }, [formData, totals, router]);

  if (!formData || !totals) {
    return (
      <div className="container mx-auto flex max-w-xl items-center justify-center px-4 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isDelivery = formData.deliveryMethod === "DELIVERY";

  const handleConfirm = async () => {
    if ((items?.length ?? 0) === 0) {
      toast.error("Tu carrito está vacío");
      return;
    }

    setSubmitting(true);

    try {
      const orderItems = (items ?? [])
        .map((item) => {
          const qty = Number(item.quantity ?? 0);
          return {
            productId: item.id,
            quantity: Number.isFinite(qty) && qty > 0 ? qty : 0,
          };
        })
        .filter((i) => i.quantity > 0);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formData.customerName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          deliveryMethod: formData.deliveryMethod,
          address: isDelivery ? formData.address.trim() : "",
          addressDetails: isDelivery ? formData.addressDetails.trim() : "",
          notes: formData.notes.trim(),
          pickupDate: !isDelivery ? formData.pickupDate : "",
          pickupTimeSlot: !isDelivery ? formData.pickupTimeSlot : "",
          pickupNotes: !isDelivery ? (formData.pickupNotes?.trim() ?? "") : "",
          deliveryZone: isDelivery ? formData.deliveryZone : "",
          items: orderItems,
          paymentMethod: "BANK_TRANSFER",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const missing: string[] = data?.missingProducts ?? [];
        if (missing.length > 0) {
          missing.forEach((id) => useCartStore.getState().removeItem(id));
          toast.error(
            `${missing.length === 1 ? "Un producto" : "Algunos productos"} de tu carrito ya no están disponibles y fueron removidos. Revisá tu pedido antes de continuar.`,
            { duration: 6000 }
          );
        } else {
          toast.error(data?.error ?? "No se pudo crear el pedido");
        }
        return;
      }

      navigatingRef.current = true;
      useCartStore.getState().clearCart();
      clearCheckout();

      // Store guest contact in sessionStorage instead of URL params
      const guestContactData = {
        name: formData.customerName ?? "",
        email: formData.email ?? "",
        phone: formData.phone ?? "",
      };
      if (typeof window !== "undefined") {
        sessionStorage.setItem("carniceria_guest_contact", JSON.stringify(guestContactData));
      }

      const params = new URLSearchParams();
      if (data?.orderNumber) params.set("orderNumber", data.orderNumber);
      if (data?.orderId) params.set("orderId", data.orderId);
      if (data?.transferCode) params.set("code", data.transferCode);
      params.set("paymentMethod", "BANK_TRANSFER");
      params.set("deliveryMethod", formData.deliveryMethod);
      if (totals?.total != null) params.set("total", String(totals.total));
      if (isDelivery) {
        if (formData.address) params.set("address", formData.address);
        if (formData.addressDetails) params.set("addressDetails", formData.addressDetails);
      } else {
        if (formData.pickupDate) params.set("pickupDate", formData.pickupDate);
        if (formData.pickupTimeSlot) params.set("pickupTimeSlot", formData.pickupTimeSlot);
      }

      router.push(`/orden-confirmada?${params.toString()}`);
    } catch (e) {
      console.error("transferencia confirm error:", e);
      toast.error("Error al confirmar el pedido");
    } finally {
      setSubmitting(false);
    }
  };

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
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Realizá tu transferencia</CardTitle>
              <p className="text-sm text-muted-foreground">
                Transferí el monto exacto para confirmar tu pedido
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-5 md:p-6">
          {/* Monto */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="mb-1 text-sm text-muted-foreground">Monto a transferir</p>
            <p className="text-3xl font-bold text-primary">{formatPrice(totals.total)}</p>
          </div>

          {/* Datos bancarios */}
          <div className="space-y-3 rounded-2xl border bg-background p-4">
            <p className="text-sm font-semibold">Datos para la transferencia</p>
            <CopyField label="CVU" value={TRANSFER_INFO.cvu} />
            <CopyField label="Alias" value={TRANSFER_INFO.alias} />
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Titular</p>
              <p className="text-sm font-semibold">{TRANSFER_INFO.name}</p>
            </div>
          </div>

          {/* Botón confirmar */}
          <Button
            size="lg"
            className="h-12 w-full rounded-xl text-sm font-semibold"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                Confirmar pedido
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
