"use client";

import { Info, MapPin, Store, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CheckoutFormData } from "@/components/checkout/types";

interface DeliveryStepProps {
  formData: CheckoutFormData;
  onChange: (field: keyof CheckoutFormData, value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function DeliveryStep({
  formData,
  onChange,
  onBack,
  onContinue,
}: DeliveryStepProps) {
  const isPickup = formData.deliveryMethod === "PICKUP";
  const isDelivery = formData.deliveryMethod === "DELIVERY";

  return (
    <Card className="overflow-hidden rounded-3xl border-border/60 shadow-sm">
      <CardHeader className="border-b bg-muted/30">
        <div className="space-y-1">
          <CardTitle className="text-xl">Método de entrega</CardTitle>
          <p className="text-sm text-muted-foreground">
            Elegí si querés retirar tu pedido en el local o recibirlo por envío a domicilio.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onChange("deliveryMethod", "PICKUP")}
            className={`rounded-2xl border p-4 text-left transition ${
              isPickup
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border bg-background hover:border-primary/40"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  isPickup
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Store className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="font-semibold">Retiro en el local</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tu pedido se prepara y lo pasás a buscar por nuestra sucursal.
                </p>

                <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Sarmiento 403</span>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  Lunes a Sábado: 07:30 - 13:00 y 17:00 - 22:00
                  <br />
                  Domingos: 08:00 - 13:00
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChange("deliveryMethod", "DELIVERY")}
            className={`rounded-2xl border p-4 text-left transition ${
              isDelivery
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border bg-background hover:border-primary/40"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  isDelivery
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Truck className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="font-semibold">Envío a domicilio</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Recibí tu pedido en tu domicilio dentro de la zona disponible.
                </p>

                <p className="mt-3 text-sm">
                  <span className="font-medium">Costo de envío:</span>{" "}
                  <span className="text-muted-foreground">$1200</span>
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  Vas a poder completar tu dirección en el siguiente paso.
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="rounded-2xl border border-dashed bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm leading-6 text-muted-foreground">
              Si elegís <span className="font-medium">envío a domicilio</span>, se suman{" "}
              <span className="font-medium">$1200</span> al total del pedido. Si elegís{" "}
              <span className="font-medium">retiro en el local</span>, no se cobra envío.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-background p-4">
          <p className="text-sm">
            <span className="font-medium">Método seleccionado:</span>{" "}
            <span className="text-muted-foreground">
              {isPickup
                ? "Retiro en el local"
                : isDelivery
                ? "Envío a domicilio"
                : "No definido"}
            </span>
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="outline" onClick={onBack} className="rounded-xl">
            Atrás
          </Button>

          <Button
            type="button"
            onClick={onContinue}
            className="rounded-xl px-6"
            disabled={!formData.deliveryMethod}
          >
            Continuar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}