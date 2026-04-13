"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CheckoutFormData } from "@/components/checkout/types";

interface PickupStepProps {
  formData: CheckoutFormData;
  minPickupDate: string;
  pickupTimeSlots: string[];
  onChange: (field: keyof CheckoutFormData, value: string) => void;
  onBack: () => void;
  onContinue: () => void;
  disabled?: boolean;
}

function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getTodayLocalString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getSlotStartMinutes(slot: string) {
  // Soporta formatos tipo:
  // "07:30 a 09:30"
  // "07:30 - 09:30"
  // "07:30"
  const match = slot.match(/(\d{1,2}):(\d{2})/);

  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  return hours * 60 + minutes;
}

export function PickupStep({
  formData,
  minPickupDate,
  pickupTimeSlots,
  onChange,
  onBack,
  onContinue,
  disabled = false,
}: PickupStepProps) {
  const [timeError, setTimeError] = useState<string | null>(null);

  const todayString = useMemo(() => getTodayLocalString(), []);
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const effectiveMinPickupDate =
    minPickupDate > todayString ? minPickupDate : todayString;

  const isTodaySelected = formData.pickupDate === todayString;

  const slotOptions = useMemo(() => {
    return pickupTimeSlots.map((slot) => {
      const slotStartMinutes = getSlotStartMinutes(slot);

      const isPastToday =
        isTodaySelected &&
        slotStartMinutes !== null &&
        slotStartMinutes <= currentMinutes;

      return {
        value: slot,
        disabled: isPastToday,
      };
    });
  }, [pickupTimeSlots, isTodaySelected, currentMinutes]);

  const selectedSlotIsInvalid = useMemo(() => {
    if (!formData.pickupTimeSlot) return false;

    const found = slotOptions.find(
      (option) => option.value === formData.pickupTimeSlot
    );

    return found ? found.disabled : false;
  }, [formData.pickupTimeSlot, slotOptions]);

  useEffect(() => {
    if (selectedSlotIsInvalid) {
      onChange("pickupTimeSlot", "");
      setTimeError("La franja elegida ya pasó. Seleccioná un horario disponible.");
    }
  }, [selectedSlotIsInvalid, onChange]);

  const handleDateChange = (value: string) => {
    setTimeError(null);
    onChange("pickupDate", value);
  };

  const handleSlotChange = (value: string) => {
    setTimeError(null);
    onChange("pickupTimeSlot", value);
  };

  const handleContinue = () => {
    setTimeError(null);

    if (!formData.pickupDate) {
      setTimeError("Elegí un día de retiro.");
      return;
    }

    if (!formData.pickupTimeSlot) {
      setTimeError("Elegí una franja horaria.");
      return;
    }

    const selectedDate = parseLocalDate(formData.pickupDate);
    const todayDate = parseLocalDate(todayString);

    if (selectedDate < todayDate) {
      setTimeError("No podés elegir una fecha de retiro pasada.");
      return;
    }

    const slotStartMinutes = getSlotStartMinutes(formData.pickupTimeSlot);

    if (
      formData.pickupDate === todayString &&
      slotStartMinutes !== null &&
      slotStartMinutes <= currentMinutes
    ) {
      setTimeError("Ese horario de retiro ya pasó. Elegí otro.");
      return;
    }

    onContinue();
  };

  return (
    <Card className="overflow-hidden rounded-3xl border-border/60 shadow-sm">
      <CardHeader className="border-b bg-muted/30">
        <div className="space-y-1">
          <CardTitle className="text-xl">¿Cuándo vas a retirar?</CardTitle>
          <p className="text-sm text-muted-foreground">
            Elegí el día y la franja horaria en la que pensás pasar por el local.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5 md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pickupDate">Día de retiro *</Label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="pickupDate"
                type="date"
                min={effectiveMinPickupDate}
                value={formData.pickupDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="h-11 rounded-xl pl-10"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupTimeSlot">Horario de retiro *</Label>
            <Select
              value={formData.pickupTimeSlot}
              onValueChange={handleSlotChange}
              disabled={disabled}
            >
              <SelectTrigger id="pickupTimeSlot" className="h-11 rounded-xl">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Elegí una franja horaria" />
                </div>
              </SelectTrigger>

              <SelectContent>
                {slotOptions.map((slot) => (
                  <SelectItem
                    key={slot.value}
                    value={slot.value}
                    disabled={slot.disabled}
                  >
                    {slot.value}
                    {slot.disabled ? " (ya pasó)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {timeError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-400">{timeError}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="pickupNotes">Nota para el retiro (opcional)</Label>
          <div className="relative">
            <MessageSquare className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Textarea
              id="pickupNotes"
              value={formData.pickupNotes}
              onChange={(e) => onChange("pickupNotes", e.target.value)}
              placeholder="Ej: paso después de las 18 hs. Podés indicar también cómo querés el corte: bife para milanesa, bife para la plancha, etc."
              rows={4}
              className="rounded-xl pl-10"
              disabled={disabled}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-dashed bg-muted/20 p-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Elegí cuándo pensás pasar a buscar el pedido. Después también vas a
            poder ver esta información en{" "}
            <span className="font-medium">“Mis compras”</span>.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="rounded-xl"
            disabled={disabled}
          >
            Atrás
          </Button>

          <Button
            type="button"
            onClick={handleContinue}
            className="h-11 rounded-xl px-6"
            disabled={disabled}
          >
            Continuar al pago
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}