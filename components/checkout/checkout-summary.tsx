"use client";

import {
  CreditCard,
  Loader2,
  ShieldCheck,
  Truck,
  Wallet,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils-format";

interface CheckoutSummaryProps {
  subtotal: number;
  subtotalNet: number;
  total: number;
  deliveryCost: number;
  deliveryMethod: "PICKUP" | "DELIVERY";
  submitting?: boolean;
  canPay?: boolean;
  onBack?: () => void;
  onMercadoPago: () => void;
  onCashOrder: () => void;
}

export function CheckoutSummary({
  subtotal,
  subtotalNet,
  total,
  deliveryCost,
  deliveryMethod,
  submitting = false,
  canPay = false,
  onBack,
  onMercadoPago,
  onCashOrder,
}: CheckoutSummaryProps) {
  const isDelivery = deliveryMethod === "DELIVERY";
  const shippingAmount = isDelivery ? deliveryCost : 0;

  return (
    <Card className="overflow-hidden rounded-3xl border-border/60 shadow-sm">
      <CardHeader className="border-b bg-muted/30 pb-4">
        <CardTitle className="text-xl">Resumen de compra</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 p-5 md:p-6">
        <div className="space-y-3 rounded-2xl border bg-background p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatPrice(subtotal)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Precio sin impuestos</span>
            <span className="text-muted-foreground">
              {formatPrice(subtotalNet)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {isDelivery ? "Envío a domicilio" : "Retiro en local"}
            </span>

            <span className="font-medium">
              {isDelivery ? formatPrice(shippingAmount) : "Gratis"}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-primary">
                {formatPrice(total)}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {isDelivery ? (
                <Truck className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </div>
          </div>
        </div>

        {!canPay && (
          <div className="rounded-2xl border border-dashed bg-muted/20 p-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Completá los pasos anteriores para habilitar las opciones de pago.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full rounded-xl text-sm font-semibold"
            disabled={submitting || !canPay}
            onClick={onMercadoPago}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Finalizar con Mercado Pago
              </>
            )}
          </Button>

          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-12 w-full rounded-xl text-sm font-semibold"
            disabled={submitting || !canPay}
            onClick={onCashOrder}
          >
            <Wallet className="mr-2 h-4 w-4" />
            {isDelivery
              ? "Confirmar pedido y pagar al recibir"
              : "Pagar en el local"}
          </Button>
        </div>

        {onBack ? (
          <div className="pt-1">
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-xl"
              onClick={onBack}
              disabled={submitting}
            >
              Atrás
            </Button>
          </div>
        ) : null}

        <p className="text-center text-xs leading-5 text-muted-foreground">
          Al confirmar el pedido, aceptás nuestros términos y condiciones.
        </p>
      </CardContent>
    </Card>
  );
}