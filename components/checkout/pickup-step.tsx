"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CheckoutFormData } from "@/components/checkout/types";

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

function getTodayLocalString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(s: string): Date {
  const [y, mo, d] = s.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

function generateDays(count = 7): { dateString: string; date: Date }[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { dateString: ds, date: d };
  });
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
  minPickupDate: string;
  pickupTimeSlots: string[];
  onChange: (field: keyof CheckoutFormData, value: string) => void;
  onBack: () => void;
  onContinue: () => void;
  disabled?: boolean;
}

// ─── Main component ───────────────────────────────────────────────────────────

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

  const isTodaySelected = formData.pickupDate === todayString;

  const effectiveMinDate = minPickupDate > todayString ? minPickupDate : todayString;

  // Generate 7 upcoming days with metadata
  const days = useMemo(() => {
    return generateDays(7).map(({ dateString, date }, i) => {
      const isToday = i === 0;

      // Today becomes disabled when all slots have already started
      const todayExhausted =
        isToday &&
        pickupTimeSlots.every((slot) => {
          const mins = getSlotStartMinutes(slot);
          return mins !== null && mins <= currentMinutes;
        });

      const dayLabel =
        i === 0 ? "Hoy" : i === 1 ? "Mañana" : DAY_NAMES_SHORT[date.getDay()];
      const dateDisplay = `${date.getDate()}/${date.getMonth() + 1}`;

      return {
        dateString,
        date,
        dayLabel,
        dateDisplay,
        isDisabled: todayExhausted || dateString < effectiveMinDate,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupTimeSlots, currentMinutes, effectiveMinDate]);

  // Slot options — disabled if today is selected and the slot already started
  const slotOptions = useMemo(() => {
    return pickupTimeSlots.map((slot) => {
      const slotStartMinutes = getSlotStartMinutes(slot);
      const isPastToday =
        isTodaySelected &&
        slotStartMinutes !== null &&
        slotStartMinutes <= currentMinutes;
      return { value: slot, disabled: isPastToday };
    });
  }, [pickupTimeSlots, isTodaySelected, currentMinutes]);

  // Detect if the currently-selected slot became invalid (time passed)
  const selectedSlotIsInvalid = useMemo(() => {
    if (!formData.pickupTimeSlot) return false;
    const found = slotOptions.find((o) => o.value === formData.pickupTimeSlot);
    return found ? found.disabled : false;
  }, [formData.pickupTimeSlot, slotOptions]);

  useEffect(() => {
    if (selectedSlotIsInvalid) {
      onChange("pickupTimeSlot", "");
      setTimeError("La franja elegida ya pasó. Seleccioná un horario disponible.");
    }
  }, [selectedSlotIsInvalid, onChange]);

  const handleDateSelect = (dateString: string) => {
    setTimeError(null);
    onChange("pickupDate", dateString);

    // Clear time slot if it would be invalid on the newly-selected day
    if (dateString === todayString && formData.pickupTimeSlot) {
      const mins = getSlotStartMinutes(formData.pickupTimeSlot);
      if (mins !== null && mins <= currentMinutes) {
        onChange("pickupTimeSlot", "");
      }
    }
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
            disabled={disabled}
          >
            Continuar al pago
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
