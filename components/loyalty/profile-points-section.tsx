import { Coins } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils-format";

export type ProfilePointsHistoryKind = "EARNED" | "USED" | "EXPIRED" | "REVOKED" | "RESTORED";

/** Datos de "Mis puntos" que arma app/(shop)/perfil/page.tsx en el servidor. */
export type ProfilePointsData = {
  balance: number;
  balanceCents: number;
  nextExpiry: { points: number; expiresAt: string } | null;
  history: {
    kind: ProfilePointsHistoryKind;
    points: number;
    date: string;
    orderNumber: string | null;
  }[];
};

const HISTORY_LABEL: Record<ProfilePointsHistoryKind, { label: string; sign: "+" | "-" }> = {
  EARNED: { label: "Ganaste", sign: "+" },
  USED: { label: "Usaste", sign: "-" },
  EXPIRED: { label: "Vencieron", sign: "-" },
  REVOKED: { label: "Se quitaron por un pedido cancelado", sign: "-" },
  RESTORED: { label: "Te devolvimos por un pedido cancelado", sign: "+" },
};

function pointsLabel(n: number) {
  return `${n.toLocaleString("es-AR")} ${n === 1 ? "punto" : "puntos"}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ProfilePointsSection({ points }: { points: ProfilePointsData }) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <CardTitle>Mis puntos</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-3xl font-bold">{pointsLabel(points.balance)}</p>
          {points.balance > 0 && (
            <p className="text-sm text-muted-foreground">
              Equivalen a {formatPrice(points.balanceCents)} de descuento.
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {points.nextExpiry
              ? `El ${formatDate(points.nextExpiry.expiresAt)} vencen ${pointsLabel(points.nextExpiry.points)}.`
              : "No tenés puntos por vencer."}
          </p>
        </div>

        <Separator />

        <div>
          <h3 className="mb-2 text-sm font-semibold">Cómo funciona</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Sumás 1 punto cada $100 de productos, pagando en efectivo o Talo Pay. El envío no cuenta.</li>
            <li>Los puntos se acreditan cuando se confirma el pago.</li>
            <li>Cada 10 puntos valen $50. Podés canjear desde los 100 puntos y cubrir hasta la mitad de tus productos.</li>
            <li>Los puntos vencen a los 45 días de ganarlos. Siempre usamos primero los que vencen antes.</li>
            <li>Con tarjeta no se suman ni se usan puntos. La compra con descuento de bienvenida no suma.</li>
          </ul>
        </div>

        <Separator />

        <div>
          <h3 className="mb-2 text-sm font-semibold">Movimientos</h3>
          {points.history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no tenés movimientos.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {points.history.map((h, i) => {
                const meta = HISTORY_LABEL[h.kind];
                return (
                  <li key={`${h.kind}-${h.date}-${i}`} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm">{meta.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(h.date)}
                        {h.orderNumber ? ` · Orden #${h.orderNumber}` : ""}
                      </p>
                    </div>
                    <span
                      className={
                        meta.sign === "+"
                          ? "shrink-0 text-sm font-semibold text-green-700 dark:text-green-400"
                          : "shrink-0 text-sm font-semibold text-muted-foreground"
                      }
                    >
                      {meta.sign}
                      {h.points.toLocaleString("es-AR")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
