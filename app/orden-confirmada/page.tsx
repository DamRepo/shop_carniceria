"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Home, ShoppingBag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { estimateReadyAt, formatReadyAtEsAR } from "@/lib/business-hours";

function OrderConfirmedContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams?.get?.("orderNumber");

  // Estimación desde "ahora" (sirve para esta pantalla inmediata).
  // Si querés 100% exacto desde createdAt real de la orden, después lo conectamos a backend.
  const { readyLabel, note } = useMemo(() => {
    const est = estimateReadyAt(new Date(), 2);
    return {
      readyLabel: formatReadyAtEsAR(est.readyAt),
      note: est.note,
    };
  }, []);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-20">
      <Card>
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="h-20 w-20 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold">¡Pedido confirmado!</h1>
            <p className="text-muted-foreground text-lg">
              Tu pedido fue recibido exitosamente
            </p>
          </div>

          {orderNumber && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Número de pedido
              </p>
              <p className="text-2xl font-bold font-mono">{orderNumber}</p>
            </div>
          )}

          {/* Info unificada */}
          <div className="bg-muted p-4 rounded-lg text-left space-y-2">
            <p className="font-medium">¿Qué sigue?</p>

            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Estamos procesando tu pedido.</li>
              <li>
                El estado de tu pedido lo podés ver en{" "}
                <Link
                  href="/mis-compras"
                  className="underline underline-offset-4"
                >
                  Mis compras
                </Link>
                .
              </li>
              <li>
                Tu pedido estará listo aproximadamente{" "}
                <span className="font-medium capitalize">{readyLabel}</span>.
                <span className="block text-xs text-muted-foreground mt-1">
                  {note}
                </span>
              </li>
              <li>
                Cuando gustes, despues de ese horario pasá a retirarlo por el local.
              </li>
            </ul>

            <p className="text-xs text-muted-foreground pt-2">
              Horarios: Lun–Sáb 07:30–13:00 y 17:00–22:00 · Dom 08:00–13:00
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/">
              <Button variant="outline" size="lg">
                <Home className="mr-2 h-4 w-4" />
                Volver al inicio
              </Button>
            </Link>
            <Link href="/productos">
              <Button size="lg">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Seguir comprando
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-3xl px-4 py-20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <OrderConfirmedContent />
    </Suspense>
  );
}
