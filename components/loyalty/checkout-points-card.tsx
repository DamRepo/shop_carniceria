"use client";

import { Coins } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils-format";

/** Respuesta de POST /api/loyalty/points-quote (solo para mostrar). */
export type CheckoutPointsPreviewData = {
  subtotalCents: number;
  welcomeDiscountCents: number;
  balance: number;
  balanceCents: number;
  canRedeem: boolean;
  maxPoints: number;
  discountCents: number;
  reason: string | null;
  missingPoints: number;
  earnIfRedeem: number;
  earnIfNotRedeem: number;
};

function num(data: Record<string, unknown>, key: string): number | null {
  const v = data[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Valida la respuesta del endpoint; null si no tiene la forma esperada. */
export function parsePointsPreview(data: unknown): CheckoutPointsPreviewData | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  const keys = [
    "subtotalCents",
    "welcomeDiscountCents",
    "balance",
    "balanceCents",
    "maxPoints",
    "discountCents",
    "missingPoints",
    "earnIfRedeem",
    "earnIfNotRedeem",
  ] as const;
  const values: Partial<Record<(typeof keys)[number], number>> = {};
  for (const k of keys) {
    const v = num(d, k);
    if (v === null) return null;
    values[k] = v;
  }
  return {
    subtotalCents: values.subtotalCents ?? 0,
    welcomeDiscountCents: values.welcomeDiscountCents ?? 0,
    balance: values.balance ?? 0,
    balanceCents: values.balanceCents ?? 0,
    canRedeem: d.canRedeem === true,
    maxPoints: values.maxPoints ?? 0,
    discountCents: values.discountCents ?? 0,
    reason: typeof d.reason === "string" ? d.reason : null,
    missingPoints: values.missingPoints ?? 0,
    earnIfRedeem: values.earnIfRedeem ?? 0,
    earnIfNotRedeem: values.earnIfNotRedeem ?? 0,
  };
}

/** Motivos en los que no se muestra nada de puntos (invitado, cuenta no cliente). */
const HIDDEN_REASONS = ["DISABLED", "NOT_LOGGED_IN", "USER_NOT_FOUND", "NOT_CUSTOMER"];

export function shouldShowPointsCard(preview: CheckoutPointsPreviewData | null): boolean {
  return preview !== null && !HIDDEN_REASONS.includes(preview.reason ?? "");
}

function pointsLabel(n: number) {
  return `${n.toLocaleString("es-AR")} ${n === 1 ? "punto" : "puntos"}`;
}

export function CheckoutPointsCard({
  preview,
  isCard,
  welcomeActive,
  usePoints,
  onToggle,
  disabled,
}: {
  preview: CheckoutPointsPreviewData;
  /** Medio elegido: tarjeta (Mercado Pago). */
  isCard: boolean;
  /** La compra usa la bienvenida: no se muestra el interruptor. */
  welcomeActive: boolean;
  usePoints: boolean;
  onToggle: (next: boolean) => void;
  disabled: boolean;
}) {
  const showToggle = !isCard && !welcomeActive;
  const toggleEnabled = showToggle && preview.canRedeem && !disabled;
  const active = showToggle && preview.canRedeem && usePoints;
  const earn = active ? preview.earnIfRedeem : preview.earnIfNotRedeem;

  let helper: string | null = null;
  if (showToggle && !preview.canRedeem) {
    helper =
      preview.reason === "BELOW_MINIMUM"
        ? `Te faltan ${pointsLabel(preview.missingPoints)} para poder canjear.`
        : "Para canjear puntos, tus productos tienen que sumar al menos $100.";
  }

  return (
    <section
      aria-labelledby="checkout-points-title"
      className="rounded-2xl border border-border/60 bg-muted/20 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Coins className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="checkout-points-title" className="text-base font-semibold">
            Tus puntos
          </h2>
          <p className="text-sm text-muted-foreground">
            Tenés {pointsLabel(preview.balance)}
            {preview.balance > 0 && <> (equivalen a {formatPrice(preview.balanceCents)})</>}.
          </p>
        </div>
      </div>

      {isCard && (
        <p role="status" className="mt-3 text-sm text-amber-800 dark:text-amber-300">
          Con tarjeta no se suman ni se usan puntos.
        </p>
      )}

      {!isCard && welcomeActive && (
        <p className="mt-3 text-sm text-muted-foreground">
          Esta compra usa el descuento de bienvenida, así que no suma puntos. Empezás a sumar desde tu próxima compra.
        </p>
      )}

      {showToggle && (
        <div className="mt-4">
          <button
            type="button"
            aria-pressed={active}
            aria-describedby="checkout-points-detail"
            disabled={!toggleEnabled}
            onClick={() => onToggle(!usePoints)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active ? "border-primary bg-primary/5" : "border-border/60 bg-background",
              !toggleEnabled && "cursor-not-allowed opacity-60"
            )}
          >
            <span className="font-medium">Usar mis puntos</span>
            <span
              aria-hidden="true"
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                active ? "bg-primary" : "bg-muted-foreground/30"
              )}
            >
              <span
                className={cn(
                  "inline-block h-5 w-5 rounded-full bg-background shadow transition-transform",
                  active ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </span>
          </button>
          <p id="checkout-points-detail" className="mt-2 text-sm text-muted-foreground">
            {preview.canRedeem
              ? `Usás ${pointsLabel(preview.maxPoints)} y te descontamos ${formatPrice(preview.discountCents)}.`
              : helper}
          </p>
        </div>
      )}

      {showToggle && earn > 0 && (
        <p className="mt-2 text-sm font-medium text-green-700 dark:text-green-400">
          Con esta compra ganás {pointsLabel(earn)} (no cuenta el envío).
        </p>
      )}
    </section>
  );
}
