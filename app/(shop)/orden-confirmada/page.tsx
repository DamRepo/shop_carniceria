"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  Check,
  CheckCircle,
  Clock3,
  Copy,
  Home,
  Loader2,
  MapPin,
  Receipt,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TRANSFER_INFO } from "@/lib/transfer-info";
import { formatPrice } from "@/lib/utils-format";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2.5">
        <span className="flex-1 truncate font-mono text-sm font-semibold">{value}</span>
        <button
          type="button"
          aria-label={`Copiar ${label}`}
          onClick={() => {
            navigator.clipboard.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className="shrink-0 rounded-lg p-1 transition-colors hover:bg-muted"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}

function formatPickupDateEs(dateString: string | null) {
  if (!dateString) return null;

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function buildDeliveryAddress({
  address,
  addressDetails,
}: {
  address: string | null;
  addressDetails: string | null;
}) {
  const parts = [address, addressDetails]
    .map((v) => (v ?? "").trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Dirección a confirmar";
}

function OrderConfirmedContent() {
  const searchParams = useSearchParams();

  const transferCode = searchParams?.get?.("code");
  const orderNumberParam = searchParams?.get?.("orderNumber");
  const orderIdParam = searchParams?.get?.("orderId");
  const displayCode = transferCode || orderNumberParam || orderIdParam;

  const deliveryMethod =
    (searchParams?.get?.("deliveryMethod") as "PICKUP" | "DELIVERY" | null) ??
    "PICKUP";

  const paymentMethod = searchParams?.get?.("paymentMethod");
  const totalParam = searchParams?.get?.("total");

  const pickupDate = searchParams?.get?.("pickupDate");
  const pickupTimeSlot = searchParams?.get?.("pickupTimeSlot");

  const address = searchParams?.get?.("address");
  const addressDetails = searchParams?.get?.("addressDetails");

  const formattedPickupDate = useMemo(
    () => formatPickupDateEs(pickupDate),
    [pickupDate]
  );

  const fullDeliveryAddress = useMemo(
    () => buildDeliveryAddress({ address, addressDetails }),
    [address, addressDetails]
  );

  const isDelivery = deliveryMethod === "DELIVERY";
  const isBankTransfer = paymentMethod === "BANK_TRANSFER";

  const infoMessage = useMemo(() => {
    if (isDelivery) {
      return "Podés seguir el estado de tu pedido desde Mis compras. Te lo enviaremos a la dirección indicada.";
    }

    if (formattedPickupDate && pickupTimeSlot) {
      return `Podés pasar a buscar tu pedido el ${formattedPickupDate} en la franja de ${pickupTimeSlot}.`;
    }

    if (formattedPickupDate) {
      return `Podés pasar a buscar tu pedido el ${formattedPickupDate}.`;
    }

    if (pickupTimeSlot) {
      return `Podés pasar a buscar tu pedido en la franja horaria de ${pickupTimeSlot}.`;
    }

    return "Podés consultar el detalle del retiro desde Mis compras.";
  }, [isDelivery, formattedPickupDate, pickupTimeSlot]);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 md:py-12">
      <Card className="overflow-hidden rounded-3xl border-border/60 shadow-sm">
        <CardContent className="space-y-6 p-6 text-center md:p-8">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle className="h-12 w-12" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              ¡Pedido confirmado!
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              Recibimos tu pedido correctamente.
            </p>
          </div>

          {displayCode && (
            <div className="rounded-2xl border bg-muted/40 p-4 md:p-5">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Receipt className="h-4 w-4" />
                <span>Número de pedido</span>
              </div>
              <p className="mt-2 font-mono text-2xl font-bold">{displayCode}</p>
            </div>
          )}

          {isBankTransfer && (
            <div className="space-y-3 text-left">
              {/* Estado */}
              <div className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800/40 dark:bg-blue-900/20">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                  Transferencia en revisión
                </p>
              </div>

              {/* Datos bancarios */}
              <div className="space-y-3 rounded-2xl border bg-background p-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">Datos para la transferencia</p>
                </div>

                {totalParam && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
                    <p className="mb-0.5 text-xs text-muted-foreground">Monto a transferir</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatPrice(Number(totalParam))}
                    </p>
                  </div>
                )}

                <CopyField label="CVU" value={TRANSFER_INFO.cvu} />
                <CopyField label="Alias" value={TRANSFER_INFO.alias} />
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Titular</p>
                  <p className="text-sm font-semibold">{TRANSFER_INFO.name}</p>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Verificaremos tu pago. El estado lo podés seguir desde{" "}
                <Link
                  href="/mis-compras"
                  className="font-medium underline underline-offset-4"
                >
                  Mis compras
                </Link>
                .
              </p>
            </div>
          )}

          <div className="space-y-3 rounded-2xl border bg-background p-4 text-left">
            <div>
              <p className="flex items-center gap-2 text-base font-semibold">
                {isDelivery ? (
                  <>
                    <Truck className="h-4 w-4" />
                    Envío del pedido
                  </>
                ) : (
                  <>
                    <Store className="h-4 w-4" />
                    Retiro del pedido
                  </>
                )}
              </p>
            </div>

            {isDelivery ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border bg-muted/20 p-4 sm:col-span-2">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Dirección de entrega
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {fullDeliveryAddress}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed bg-muted/20 p-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    El estado de tu pedido lo podés seguir desde{" "}
                    <Link
                      href="/mis-compras"
                      className="font-medium underline underline-offset-4"
                    >
                      Mis compras
                    </Link>
                    . Te lo enviaremos a la dirección indicada en tu pedido.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      Día
                    </div>
                    <p className="text-sm capitalize text-muted-foreground">
                      {formattedPickupDate ?? "A confirmar"}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Clock3 className="h-4 w-4 text-muted-foreground" />
                      Horario
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pickupTimeSlot ?? "A confirmar"}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Dirección
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Sarmiento 403
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed bg-muted/20 p-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    El estado de tu pedido lo podés seguir desde{" "}
                    <Link
                      href="/mis-compras"
                      className="font-medium underline underline-offset-4"
                    >
                      Mis compras
                    </Link>
                    . Cuando llegue el momento del retiro, pasá por el local
                    dentro de la franja horaria elegida.
                  </p>
                </div>

                <p className="text-xs text-muted-foreground">
                  Horarios del local: Lun–Sáb 07:30–13:00 y 16:00–21:00 · Dom 08:30–13:00
                </p>
              </>
            )}

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-sm leading-6 text-muted-foreground">
                {infoMessage}
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4 pt-2 sm:flex-row">
            <Link href="/">
              <Button variant="outline" size="lg" className="rounded-xl">
                <Home className="mr-2 h-4 w-4" />
                Volver al inicio
              </Button>
            </Link>

            <Link href="/productos">
              <Button size="lg" className="rounded-xl">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Seguir comprando
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex max-w-5xl items-center justify-center px-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <OrderConfirmedContent />
    </Suspense>
  );
}
