"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  CreditCard,
  Loader2,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCartStore } from "@/lib/store";
import { useCheckoutStore } from "@/lib/checkout-store";
import { formatPrice } from "@/lib/utils-format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PaymentMethod = "BANK_TRANSFER" | "MERCADO_PAGO" | "CASH";

type CartItemLike = { id: string; quantity: number };

function normalizeQty(item: CartItemLike) {
  const qty = Number(item.quantity ?? 0);
  return Number.isFinite(qty) && qty > 0 ? qty : 0;
}

function PaymentOption({
  selected,
  disabled,
  onClick,
  icon: Icon,
  title,
  description,
  badge,
}: {
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  description?: string;
  badge?: string;
}) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={() => {
        if (!disabled) onClick();
      }}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "cursor-pointer rounded-2xl border-2 p-4 transition-all",
        disabled && "cursor-not-allowed opacity-50",
        selected
          ? "border-primary bg-primary/5"
          : "border-border/60 bg-background hover:border-primary/30"
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
            selected
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "text-base font-semibold",
                selected && "text-primary"
              )}
            >
              {title}
            </p>
            {badge && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        <div
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            selected
              ? "border-primary bg-primary"
              : "border-muted-foreground/30 bg-background"
          )}
        >
          {selected && (
            <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function MetodoPagoPage() {
  const router = useRouter();
  const { formData, totals, clear: clearCheckout } = useCheckoutStore();
  const items = useCartStore((s) => s?.items);

  const [selected, setSelected] = useState<PaymentMethod | null>(null);
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
      <div className="container mx-auto flex max-w-2xl items-center justify-center px-4 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isDelivery = formData.deliveryMethod === "DELIVERY";

  const buildOrderBody = (paymentMethod: "CASH" | "BANK_TRANSFER") => {
    const orderItems = (items ?? [])
      .map((item) => ({
        productId: item.id,
        quantity: normalizeQty(item as CartItemLike),
      }))
      .filter((i) => i.quantity > 0);

    return {
      customerName: formData.customerName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      deliveryMethod: formData.deliveryMethod,
      address: isDelivery ? formData.address.trim() : "",
      addressDetails: isDelivery ? formData.addressDetails.trim() : "",
      notes: formData.notes.trim(),
      pickupDate: !isDelivery ? formData.pickupDate : "",
      pickupTimeSlot: !isDelivery ? formData.pickupTimeSlot : "",
      pickupNotes: !isDelivery ? formData.pickupNotes.trim() : "",
      deliveryZone: isDelivery ? formData.deliveryZone : "",
      items: orderItems,
      paymentMethod,
    };
  };

  const buildMPBody = () => {
    const orderItems = (items ?? [])
      .map((item) => ({
        productId: item.id,
        quantity: normalizeQty(item as CartItemLike),
      }))
      .filter((i) => i.quantity > 0);

    return {
      customerName: formData.customerName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      deliveryMethod: formData.deliveryMethod,
      address: isDelivery ? formData.address.trim() : "",
      addressDetails: isDelivery ? formData.addressDetails.trim() : "",
      notes: formData.notes.trim(),
      pickupDate: !isDelivery ? formData.pickupDate : "",
      pickupTimeSlot: !isDelivery ? formData.pickupTimeSlot : "",
      pickupNotes: !isDelivery ? formData.pickupNotes.trim() : "",
      deliveryZone: isDelivery ? formData.deliveryZone : "",
      items: orderItems,
    };
  };

  const handleOrderError = (data: any) => {
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
  };

  const handleContinue = async () => {
    if (!selected) {
      toast.error("Seleccioná un método de pago");
      return;
    }

    if ((items?.length ?? 0) === 0) {
      toast.error("Tu carrito está vacío");
      return;
    }

    setSubmitting(true);

    try {
      if (selected === "MERCADO_PAGO") {
        const res = await fetch("/api/mercadopago/preference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildMPBody()),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          const detail = data?.detail ? ` — ${data.detail}` : "";
          toast.error((data?.error ?? "No se pudo iniciar el pago") + detail);
          return;
        }

        const initPoint = data?.initPoint as string | undefined;

        if (!initPoint) {
          toast.error("No pudimos iniciar el pago. Por favor intentá de nuevo.");
          return;
        }

        window.location.href = initPoint;
        return;
      }

      if (selected === "BANK_TRANSFER") {
        router.push("/checkout/transferencia");
        return;
      }

      // CASH
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildOrderBody("CASH")),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        handleOrderError(data);
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
      params.set("deliveryMethod", formData.deliveryMethod);
      if (isDelivery) {
        if (formData.address) params.set("address", formData.address);
        if (formData.addressDetails) params.set("addressDetails", formData.addressDetails);
      } else {
        if (formData.pickupDate) params.set("pickupDate", formData.pickupDate);
        if (formData.pickupTimeSlot) params.set("pickupTimeSlot", formData.pickupTimeSlot);
      }

      router.push(`/orden-confirmada?${params.toString()}`);
    } catch (e) {
      console.error("metodo-pago handleContinue error:", e);
      toast.error("Error al procesar el pedido");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6 md:py-10">
      <button
        type="button"
        onClick={() => router.push("/checkout")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver a los datos del pedido
      </button>

      <div className="mb-6 rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/30 px-4 py-4 shadow-sm md:px-6 md:py-5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Elegí cómo querés pagar
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seleccioná el método de pago para tu pedido.
        </p>
      </div>

      <Card className="overflow-hidden rounded-3xl border-border/60 shadow-sm">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Total a pagar</CardTitle>
            <span className="text-2xl font-bold text-primary">
              {formatPrice(totals.total)}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-5 md:p-6">
          <div
            className="space-y-3"
            role="radiogroup"
            aria-label="Método de pago"
          >
            <PaymentOption
              selected={selected === "BANK_TRANSFER"}
              disabled={submitting}
              onClick={() => setSelected("BANK_TRANSFER")}
              icon={Building2}
              title="Transferencia bancaria"
              description="CVU o alias — sin comisiones"
              badge="Sin recargo"
            />

            <PaymentOption
              selected={selected === "MERCADO_PAGO"}
              disabled={submitting}
              onClick={() => setSelected("MERCADO_PAGO")}
              icon={CreditCard}
              title="Tarjeta de débito o crédito"
              description="Vía Mercado Pago — seguro y rápido"
            />

            <PaymentOption
              selected={selected === "CASH"}
              disabled={submitting}
              onClick={() => setSelected("CASH")}
              icon={Wallet}
              title={isDelivery ? "Pagar al recibir" : "Pagar en el local"}
              description={
                isDelivery
                  ? "Abonás cuando te lo entregamos"
                  : "Abonás al pasar a retirar"
              }
            />
          </div>

          <div className="pt-2">
            <Button
              size="lg"
              className="h-12 w-full rounded-xl text-sm font-semibold"
              disabled={!selected || submitting}
              onClick={handleContinue}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
