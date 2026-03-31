"use client";

import { CreditCard, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils-format";

interface PaymentStepProps {
  total: number;
  submitting?: boolean;
  onBack: () => void;
  onMercadoPago: () => void;
  onCashOrder: () => void;
}

export function PaymentStep({
  total,
  submitting = false,
  onBack,
  onMercadoPago,
  onCashOrder,
}: PaymentStepProps) {
  return (
    <Card className="overflow-hidden rounded-3xl border-border/60 shadow-sm">
      <CardHeader className="border-b bg-muted/30">
        <div className="space-y-1">
          <CardTitle className="text-xl">Pago</CardTitle>
          <p className="text-sm text-muted-foreground">
            Elegí cómo querés finalizar tu pedido.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5 md:p-6">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total a pagar</p>
              <p className="text-2xl font-bold text-primary">{formatPrice(total)}</p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full rounded-xl text-sm font-semibold"
            disabled={submitting}
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
                Pagar con Mercado Pago
              </>
            )}
          </Button>

          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-12 w-full rounded-xl text-sm font-semibold"
            disabled={submitting}
            onClick={onCashOrder}
          >
            <Wallet className="mr-2 h-4 w-4" />
            Confirmar y pagar en efectivo
          </Button>
        </div>

        <div className="rounded-2xl border bg-muted/20 p-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Podés pagar ahora de forma online con Mercado Pago o confirmar tu pedido
            y abonarlo directamente al retirarlo en el local.
          </p>
        </div>

        <div className="flex justify-start pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="rounded-xl"
            disabled={submitting}
          >
            Atrás
          </Button>
        </div>

        <p className="text-center text-xs leading-5 text-muted-foreground">
          Al confirmar el pedido, aceptás nuestros términos y condiciones.
        </p>
      </CardContent>
    </Card>
  );
}