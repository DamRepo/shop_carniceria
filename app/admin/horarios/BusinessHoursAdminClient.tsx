"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  describeWeekHours,
  validateBusinessHours,
  type BusinessHoursRow,
} from "@/lib/business-hours";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

type TimeField = "openMorning" | "closeMorning" | "openAfternoon" | "closeAfternoon";

// En el formulario los horarios vacíos son "" (inputs controlados); en la API, null.
type FormDay = { dayOfWeek: number; isClosed: boolean } & Record<TimeField, string>;

function toFormDay(row: BusinessHoursRow): FormDay {
  return {
    dayOfWeek: row.dayOfWeek,
    isClosed: row.isClosed,
    openMorning: row.openMorning ?? "",
    closeMorning: row.closeMorning ?? "",
    openAfternoon: row.openAfternoon ?? "",
    closeAfternoon: row.closeAfternoon ?? "",
  };
}

function toRow(day: FormDay): BusinessHoursRow {
  return {
    dayOfWeek: day.dayOfWeek,
    isClosed: day.isClosed,
    openMorning: day.openMorning || null,
    closeMorning: day.closeMorning || null,
    openAfternoon: day.openAfternoon || null,
    closeAfternoon: day.closeAfternoon || null,
  };
}

function TimeInput({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="time"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-9"
      />
    </div>
  );
}

export function BusinessHoursAdminClient() {
  const [days, setDays] = useState<FormDay[] | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/business-hours", { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as {
          days?: BusinessHoursRow[];
          usingFallback?: boolean;
          error?: string;
        } | null;
        if (cancelled) return;
        if (!res.ok || !data?.days) {
          setLoadError(data?.error ?? "No se pudo cargar el horario");
          return;
        }
        setDays(data.days.map(toFormDay));
        setUsingFallback(Boolean(data.usingFallback));
      })
      .catch(() => {
        if (!cancelled) setLoadError("No se pudo cargar el horario");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Misma validación que el servidor: el error se ve antes de guardar.
  const validation = useMemo(() => (days ? validateBusinessHours(days.map(toRow)) : null), [days]);

  const updateDay = (dayOfWeek: number, patch: Partial<FormDay>) => {
    setDays((prev) => prev?.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)) ?? prev);
  };

  const handleSave = async () => {
    if (!days || !validation?.ok) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/business-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: days.map(toRow) }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar el horario");

      setUsingFallback(false);
      toast.success("Horario guardado. El sitio lo toma en unos minutos como máximo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el horario");
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Horarios</h1>
        <p className="text-sm text-destructive">{loadError}</p>
      </div>
    );
  }

  if (!days) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const byDay = new Map(days.map((d) => [d.dayOfWeek, d]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Horarios</h1>
        <p className="text-sm text-muted-foreground">
          Horario del local para retiro y envío. Define las franjas de retiro y los avisos del checkout.
        </p>
      </div>

      {usingFallback && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p>
            La base no tiene un horario válido, así que el sitio está usando el horario fijo (el que ves
            abajo). Guardalo para empezar a editarlo desde acá.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {WEEK_ORDER.map((dow) => {
          const day = byDay.get(dow);
          if (!day) return null;
          const idPrefix = `bh-${dow}`;

          return (
            <Card key={dow} className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base text-foreground">{DAY_NAMES[dow]}</CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`${idPrefix}-closed`}
                    checked={day.isClosed}
                    onCheckedChange={(checked) => updateDay(dow, { isClosed: checked === true })}
                  />
                  <Label htmlFor={`${idPrefix}-closed`} className="text-sm">
                    Cerrado todo el día
                  </Label>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <TimeInput
                    id={`${idPrefix}-om`}
                    label="Abre (mañana)"
                    value={day.openMorning}
                    disabled={day.isClosed}
                    onChange={(v) => updateDay(dow, { openMorning: v })}
                  />
                  <TimeInput
                    id={`${idPrefix}-cm`}
                    label="Cierra (mañana)"
                    value={day.closeMorning}
                    disabled={day.isClosed}
                    onChange={(v) => updateDay(dow, { closeMorning: v })}
                  />
                  <TimeInput
                    id={`${idPrefix}-oa`}
                    label="Abre (tarde, opcional)"
                    value={day.openAfternoon}
                    disabled={day.isClosed}
                    onChange={(v) => updateDay(dow, { openAfternoon: v })}
                  />
                  <TimeInput
                    id={`${idPrefix}-ca`}
                    label="Cierra (tarde, opcional)"
                    value={day.closeAfternoon}
                    disabled={day.isClosed}
                    onChange={(v) => updateDay(dow, { closeAfternoon: v })}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <Clock className="h-4 w-4" />
            Así se va a ver en el sitio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {validation?.ok ? (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {describeWeekHours(validation.hours).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-destructive">{validation?.error}</p>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || !validation?.ok}>
              {saving ? "Guardando..." : "Guardar horario"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
