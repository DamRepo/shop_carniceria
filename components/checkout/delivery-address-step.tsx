"use client";

import { Home, MapPin, MapPinned, StickyNote } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CheckoutFormData } from "@/components/checkout/types";

interface DeliveryAddressStepProps {
  formData: CheckoutFormData;
  onChange: (field: keyof CheckoutFormData, value: string) => void;
  onBack: () => void;
  onContinue: () => void;
  disabled?: boolean;
}

export function DeliveryAddressStep({
  formData,
  onChange,
  onBack,
  onContinue,
  disabled = false,
}: DeliveryAddressStepProps) {
  return (
    <Card className="overflow-hidden rounded-3xl border-border/60 shadow-sm">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="text-2xl">¿A dónde te lo enviamos?</CardTitle>
        <p className="text-sm text-muted-foreground">
          Completá los datos del domicilio para el delivery.
        </p>
      </CardHeader>

      <CardContent className="space-y-6 p-5 md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Dirección *</Label>
            <div className="relative">
              <Home className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => onChange("address", e.target.value)}
                placeholder="Ej: Sarmiento 403"
                className="pl-10"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="addressDetails">Referencia del domicilio</Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="addressDetails"
                value={formData.addressDetails}
                onChange={(e) => onChange("addressDetails", e.target.value)}
                placeholder="Ej: casa con portón negro, entre calles..., depto 2, etc."
                className="min-h-[96px] pl-10"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Ciudad</Label>
            <div className="relative">
              <MapPinned className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => onChange("city", e.target.value)}
                placeholder="Ej: Chajarí"
                className="pl-10"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="postalCode">Código postal</Label>
            <Input
              id="postalCode"
              value={formData.postalCode}
              onChange={(e) => onChange("postalCode", e.target.value)}
              placeholder="Ej: 3228"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Nota para el pedido</Label>
            <div className="relative">
              <StickyNote className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => onChange("notes", e.target.value)}
                placeholder="Ej: tocar timbre, entregar después de las 18 hs, etc."
                className="min-h-[110px] pl-10"
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed bg-muted/20 p-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Verificá bien la dirección antes de continuar para evitar demoras en
            la entrega.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={onBack}
            disabled={disabled}
          >
            Atrás
          </Button>

          <Button
            type="button"
            className="rounded-xl"
            onClick={onContinue}
            disabled={disabled}
          >
            Continuar al pago
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}