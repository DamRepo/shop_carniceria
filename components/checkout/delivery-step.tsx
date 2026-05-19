"use client";

import { AlertCircle, Clock, MapPin, Store, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CheckoutFormData } from "@/components/checkout/types";
import { SHIPPING_ZONES, SHIPPING_OUTSIDE_MESSAGE } from "@/lib/shipping";
import type { ShippingZone } from "@/lib/shipping";
import { isCheckoutBlocked, getOrderProcessingStatus } from "@/lib/business-hours";

function getDeliveryAvailability(): { isAvailable: boolean; message: string } {
  const ahoraAR = new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" });
  const ahora = new Date(ahoraAR);
  const horaEnMinutos = ahora.getHours() * 60 + ahora.getMinutes();
  const dia = ahora.getDay();

  if (dia === 0) {
    if (horaEnMinutos >= 450 && horaEnMinutos < 720) {
      return { isAvailable: true, message: "" };
    }
    return { isAvailable: false, message: "⚠️ No hay envíos. Reabrimos el lunes a las 7:30hs." };
  }

  if (horaEnMinutos < 450) {
    return { isAvailable: false, message: "⚠️ Envíos cerrados. Reabrimos a las 7:30hs." };
  }
  if (horaEnMinutos < 720) {
    return { isAvailable: true, message: "" };
  }
  if (horaEnMinutos < 960) {
    return { isAvailable: false, message: "⚠️ Envíos cerrados hasta las 16hs." };
  }
  if (horaEnMinutos < 1200) {
    return { isAvailable: true, message: "" };
  }
  return { isAvailable: false, message: "⚠️ Envíos cerrados. Reabrimos mañana a las 7:30hs." };
}

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
  const blocked = isCheckoutBlocked();
  const processingStatus = getOrderProcessingStatus();
  const isPickup = formData.deliveryMethod === "PICKUP";
  const isDelivery = formData.deliveryMethod === "DELIVERY";
  const deliveryAvailability = getDeliveryAvailability();
  const isDeliveryUnavailable = !deliveryAvailability.isAvailable;
  const canContinue =
    !blocked && (isPickup || (isDelivery && !isDeliveryUnavailable && formData.deliveryZone !== ""));

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
        {blocked && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <p className="text-red-300">
              <span className="font-semibold">⚠️ No hay servicio disponible.</span>{" "}
              Retomamos el lunes a partir de las 8hs.
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            disabled={blocked}
            onClick={() => !blocked && onChange("deliveryMethod", "PICKUP")}
            className={`rounded-2xl border p-4 text-left transition ${
              blocked
                ? "cursor-not-allowed border-border bg-muted/50 opacity-60"
                : isPickup
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
                  Lunes a Sábado: 07:30 - 13:00 y 16:00 - 21:00
                  <br />
                  Domingos: 08:30 - 13:00
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={blocked || isDeliveryUnavailable}
            onClick={() => !(blocked || isDeliveryUnavailable) && onChange("deliveryMethod", "DELIVERY")}
            className={`rounded-2xl border p-4 text-left transition ${
              blocked || isDeliveryUnavailable
                ? "cursor-not-allowed border-border bg-muted/50 opacity-60"
                : isDelivery
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

                <p className="mt-3 text-sm text-muted-foreground">
                  Seleccioná la zona para ver el costo de envío.
                </p>
              </div>
            </div>
          </button>
        </div>

        {isDeliveryUnavailable && !blocked && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-amber-200">{deliveryAvailability.message}</p>
          </div>
        )}

        <div className="flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
          <p className="text-blue-200">
            {processingStatus.kind === "open" &&
              "Tu pedido será procesado hoy durante el horario de atención."}
            {processingStatus.kind === "later_today" &&
              `Estamos cerrados ahora. Tu pedido será procesado hoy a partir de las ${processingStatus.hour}hs.`}
            {processingStatus.kind === "next_day" &&
              "Tu pedido quedará registrado y será procesado el próximo día hábil."}
            {processingStatus.kind === "next_monday" &&
              "Tu pedido quedará registrado y será procesado el lunes a partir de las 8hs."}
          </p>
        </div>

        {isDelivery && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Zona de envío</p>

            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.entries(SHIPPING_ZONES) as [ShippingZone, (typeof SHIPPING_ZONES)[ShippingZone]][]).map(
                ([key, zone]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChange("deliveryZone", key)}
                    className={`rounded-xl border p-3 text-left transition ${
                      formData.deliveryZone === key
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <p className="text-sm font-medium">{zone.label}</p>
                    <p className="mt-1 text-base font-semibold text-primary">
                      {zone.priceDisplay}
                    </p>
                  </button>
                )
              )}
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-dashed bg-muted/20 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {SHIPPING_OUTSIDE_MESSAGE}
              </p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border bg-background p-4">
          <p className="text-sm">
            <span className="font-medium">Método seleccionado:</span>{" "}
            <span className="text-muted-foreground">
              {isPickup
                ? "Retiro en el local"
                : isDelivery && formData.deliveryZone
                ? `Envío – ${SHIPPING_ZONES[formData.deliveryZone].label} (${SHIPPING_ZONES[formData.deliveryZone].priceDisplay})`
                : isDelivery
                ? "Envío a domicilio (seleccioná la zona)"
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
            disabled={!canContinue}
          >
            Continuar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
