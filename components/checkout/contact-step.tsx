"use client";

import { Info, Phone, Mail, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CheckoutFormData } from "./types";

interface ContactStepProps {
  formData: CheckoutFormData;
  onChange: (field: keyof CheckoutFormData, value: string) => void;
  onContinue: () => void;
  disabled?: boolean;
  isGuest?: boolean;
}

export function ContactStep({
  formData,
  onChange,
  onContinue,
  disabled = false,
  isGuest = false,
}: ContactStepProps) {
  return (
    <Card className="overflow-hidden rounded-3xl border-border/60 shadow-sm">
      <CardHeader className="border-b bg-muted/30">
        <div className="space-y-1">
          <CardTitle className="text-xl">Datos de contacto</CardTitle>
          <p className="text-sm text-muted-foreground">
            Confirmá tus datos para identificar el pedido y contactarte si hace falta.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5 md:p-6">
        {isGuest && (
          <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Estás comprando como <strong>invitado</strong>. Necesitamos tu email para enviarte la confirmación del pedido.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customerName">Nombre completo *</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => onChange("customerName", e.target.value)}
                placeholder="Juan Pérez"
                className="h-11 rounded-xl pl-10"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono *</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => onChange("phone", e.target.value)}
                placeholder="11 1234-5678"
                className="h-11 rounded-xl pl-10"
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{isGuest ? "Email *" : "Email (opcional)"}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="correo@ejemplo.com"
              className="h-11 rounded-xl pl-10"
              disabled={disabled}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={onContinue}
            className="h-11 rounded-xl px-6"
            disabled={disabled}
          >
            Continuar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}