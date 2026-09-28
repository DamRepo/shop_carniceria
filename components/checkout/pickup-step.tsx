"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CheckoutFormData } from "@/components/checkout/types";
import {
  addDaysToDateString,
  getStoreNow,
  slotsForDate,
  weekdayOfDateString,
} from "@/lib/business-hours";
import { useStoreHours } from "@/lib/use-store-hours";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

interface SlotGroupDef {
  label: string;
  emoji: string;
  minMinutes: number;
  maxMinutes: number;
}

const SLOT_GROUPS: SlotGroupDef[] = [
  { label: "Mañana",   emoji: "🌅", minMinutes: 0,    maxMinutes: 719  },
  { label: "Mediodía", emoji: "🌞", minMinutes: 720,  maxMinutes: 839  },
  { label: "Tarde",    emoji: "🌆", minMinutes: 840,  maxMinutes: 1079 },
  { label: "Noche",    emoji: "🌙", minMinutes: 1080, maxMinutes: 1439 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSlotStartMinutes(slot: string): number | null {
  const match = slot.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function parseSlot(slot: string): { start: string; end: string | null } {
  const m = slot.match(/(\d{1,2}:\d{2})\s*a\s*(\d{1,2}:\d{2})/i);
  if (m) return { start: m[1], end: m[2] };
  const start = slot.match(/(\d{1,2}:\d{2})/)?.[1] ?? slot;
  return { start, end: null };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DayCard({
  label,
  dateDisplay,
  isSelected,
  isDisabled,
  onClick,
}: {
  label: string;
  dateDisplay: string;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={cn(
        "flex min-w-[68px] flex-1 flex-col items-center gap-0.5 rounded-2xl border-2 px-2 py-3 text-center transition-all select-none",
        isDisabled
          ? "cursor-not-allowed border-border/30 opacity-40"
          : isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "cursor-pointer border-border/60 hover:border-primary/40 hover:bg-muted/30 active:scale-[0.97]"
      )}
    >
      <span
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wide leading-none",
          isSelected ? "text-primary" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-bold leading-tight",
          isSelected ? "text-primary" : "text-foreground"
        )}
      >
        {dateDisplay}
      </span>
    </button>
  );
}

function SlotCard({
  slot,
  isSelected,
  isDisabled,
  onClick,
}: {
  slot: string;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
}) {
  const { start, end } = parseSlot(slot);

  return (
    <button
      type="button"
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 px-2 py-3 text-center transition-all select-none",
        isDisabled
          ? "cursor-not-allowed border-border/30 opacity-40"
          : isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "cursor-pointer border-border/60 hover:border-primary/40 hover:bg-muted/30 active:scale-[0.97]"
      )}
    >
      <span
        className={cn(
          "text-base font-bold leading-tight tabular-nums",
          isSelected ? "text-primary" : "text-foreground"
        )}
      >
        {start}
      </span>
      {end && (
        <span
          className={cn(
            "text-xs leading-tight tabular-nums",
            isSelected ? "text-primary/80" : "text-muted-foreground"
          )}
        >
          a {end}
        </span>
      )}
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PickupStepProps {
  formData: CheckoutFormData;
  onChange: (field: keyof CheckoutFormData, value: string) => void;
  onBack: () => void;
  onContinue: () => void;
  disabled?: boolean;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PickupStep({
  formData,
  onChange,
  onBack,
  onContinue,
  disabled = false,
}: PickupStepProps) {
  const [timeError, setTimeError] = useState<string | null>(null);
  // Hasta que llega el horario de la base (o vence el timeout y queda el fijo)
  // no se preselecciona ni se descarta nada.
  const { hours, ready } = useStoreHours();

  // Hora Argentina al abrir el paso: define "hoy" y qué franjas de hoy ya empezaron.
  const now = useMemo(() => getStoreNow(), []);

  // 7 días desde hoy, cada uno con las franjas de su horario (el domingo no tiene tarde).
  // Hoy no se puede elegir una franja que ya empezó; un día sin franjas queda deshabilitado.
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dateString = addDaysToDateString(now.dateString, i);
      const [, month, day] = dateString.split("-").map(Number);
      const slots = slotsForDate(dateString, hours).map((slot) => {
        const start = getSlotStartMinutes(slot);
        return { value: slot, disabled: i === 0 && (start === null || start <= now.minutes) };
      });

      return {
        dateString,
        dayLabel: i === 0 ? "Hoy" : i === 1 ? "Mañana" : DAY_NAMES_SHORT[weekdayOfDateString(dateString)],
        dateDisplay: `${day}/${month}`,
        slots,
        isDisabled: slots.every((s) => s.disabled),
      };
    });
  }, [now, hours]);

  const selectedDay = days.find((d) => d.dateString === formData.pickupDate) ?? null;
  const slotOptions = useMemo(() => selectedDay?.slots ?? [], [selectedDay]);

  // Sin día elegido: se preselecciona el primer día y franja disponibles
  // (un domingo a la noche queda en lunes 07:30 a 09:30). El cliente puede cambiarlo.
  useEffect(() => {
    if (!ready || formData.pickupDate) return;
    const firstDay = days.find((d) => !d.isDisabled);
    const firstSlot = firstDay?.slots.find((s) => !s.disabled);
    if (!firstDay || !firstSlot) return;
    onChange("pickupDate", firstDay.dateString);
    onChange("pickupTimeSlot", firstSlot.value);
  }, [ready, formData.pickupDate, days, onChange]);

  // Día o franja guardados que ya no son válidos (pasó la hora, o es de otra semana).
  const selectionIsInvalid = useMemo(() => {
    if (!formData.pickupDate) return false;
    if (!selectedDay || selectedDay.isDisabled) return true;
    if (!formData.pickupTimeSlot) return false;
    const found = slotOptions.find((o) => o.value === formData.pickupTimeSlot);
    return !found || found.disabled;
  }, [formData.pickupDate, formData.pickupTimeSlot, selectedDay, slotOptions]);

  useEffect(() => {
    if (!ready || !selectionIsInvalid) return;
    if (!selectedDay || selectedDay.isDisabled) onChange("pickupDate", "");
    onChange("pickupTimeSlot", "");
    setTimeError("La franja elegida ya no está disponible. Seleccioná otro horario.");
  }, [ready, selectionIsInvalid, selectedDay, onChange]);

  const handleDateSelect = (dateString: string) => {
    setTimeError(null);
    onChange("pickupDate", dateString);

    // La franja elegida puede no existir o ya haber pasado en el nuevo día.
    const day = days.find((d) => d.dateString === dateString);
    const stillValid = day?.slots.some((s) => s.value === formData.pickupTimeSlot && !s.disabled);
    if (formData.pickupTimeSlot && !stillValid) onChange("pickupTimeSlot", "");
  };

  const handleSlotSelect = (slot: string) => {
    setTimeError(null);
    onChange("pickupTimeSlot", slot);
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

    const slot = slotOptions.find((o) => o.value === formData.pickupTimeSlot);
    if (!selectedDay || !slot || slot.disabled) {
      setTimeError("Ese horario de retiro ya no está disponible. Elegí otro.");
      return;
    }

    // El paso pudo quedar abierto un rato: se revalida contra la hora actual.
    const fresh = getStoreNow();
    const start = getSlotStartMinutes(formData.pickupTimeSlot);
    if (formData.pickupDate === fresh.dateString && (start === null || start <= fresh.minutes)) {
      setTimeError("Ese horario de retiro ya pasó. Elegí otro.");
      return;
    }

    onContinue();
  };

  // Group slots by time period, preserving only groups that have slots
  const groupedSlots = useMemo(() => {
    return SLOT_GROUPS.map((g) => ({
      ...g,
      slots: slotOptions.filter((o) => {
        const mins = getSlotStartMinutes(o.value);
        return mins !== null && mins >= g.minMinutes && mins <= g.maxMinutes;
      }),
    })).filter((g) => g.slots.length > 0);
  }, [slotOptions]);

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

      <CardContent className="space-y-6 p-5 md:p-6">

        {/* ── Day selector ─────────────────────────────────────────── */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Día de retiro *</Label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((day) => (
              <DayCard
                key={day.dateString}
                label={day.dayLabel}
                dateDisplay={day.dateDisplay}
                isSelected={formData.pickupDate === day.dateString}
                isDisabled={disabled || day.isDisabled}
                onClick={() => handleDateSelect(day.dateString)}
              />
            ))}
          </div>
        </div>

        {/* ── Time slot selector (shows after day is chosen) ────────── */}
        {formData.pickupDate && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Horario de retiro *</Label>

            <div className="space-y-4">
              {groupedSlots.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.emoji} {group.label}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {group.slots.map((slot) => (
                      <SlotCard
                        key={slot.value}
                        slot={slot.value}
                        isSelected={formData.pickupTimeSlot === slot.value}
                        isDisabled={disabled || slot.disabled}
                        onClick={() => handleSlotSelect(slot.value)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {timeError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-400">{timeError}</p>
          </div>
        )}

        {/* ── Notes ────────────────────────────────────────────────── */}
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
            <span className="font-medium">&quot;Mis compras&quot;</span>.
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
            disabled={disabled || !ready}
          >
            Continuar al pago
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
