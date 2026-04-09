"use client";

import {
  CalendarDays,
  Clock3,
  MapPin,
  Package,
  Store,
  StickyNote,
  Truck,
  Home,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice, formatQuantity } from "@/lib/utils-format";

type CheckoutItem = {
  id: string;
  name?: string | null;
  price?: number | null;
  quantity?: number | null;
  unitType?: "PER_KG" | "PER_UNIT" | null;
};

interface CheckoutDetailsProps {
  items: CheckoutItem[];
  deliveryMethod: "PICKUP" | "DELIVERY";
  pickupDate?: string;
  pickupTimeSlot?: string;
  pickupNotes?: string;
  address?: string;
  addressDetails?: string;
  notes?: string;
}

function formatPickupDate(dateString?: string) {
  if (!dateString) return "No seleccionado";

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function CheckoutDetails({
  items,
  deliveryMethod,
  pickupDate,
  pickupTimeSlot,
  pickupNotes,
  address,
  addressDetails,
  notes,
}: CheckoutDetailsProps) {
  const isDelivery = deliveryMethod === "DELIVERY";

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-3xl border-border/60 shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-xl">Detalles del pedido</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 p-5 md:p-6">
          {items.map((item) => {
            const itemTotal = (item.price ?? 0) * (item.quantity ?? 0);

            return (
              <div
                key={item.id}
                className="rounded-2xl border bg-background p-4 transition hover:bg-muted/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Package className="h-4 w-4" />
                      </div>
                      <p className="line-clamp-2 font-semibold">
                        {item.name ?? "Producto"}
                      </p>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {formatQuantity(item.quantity ?? 0, item.unitType ?? "PER_KG")}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-base font-semibold">
                      {formatPrice(itemTotal)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-3xl border-border/60 shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-xl">
            {isDelivery ? "Entrega del pedido" : "Retiro del pedido"}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 p-5 md:p-6">
          <div className="rounded-2xl border bg-background p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {isDelivery ? (
                  <Truck className="h-5 w-5" />
                ) : (
                  <Store className="h-5 w-5" />
                )}
              </div>

              <div>
                <p className="font-semibold">
                  {isDelivery ? "Envío a domicilio" : "Retiro en el local"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isDelivery
                    ? "Tu pedido será enviado al domicilio indicado."
                    : "Pasás a buscar tu pedido por nuestra sucursal."}
                </p>
              </div>
            </div>
          </div>

          {isDelivery ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border bg-background p-4 sm:col-span-2">
                <div className="flex items-start gap-3">
                  <Home className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Domicilio</p>
                    <p className="text-sm text-muted-foreground">
                      {address?.trim() ? address : "No informado"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4 sm:col-span-2">
                <div className="flex items-start gap-3">
                  <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Referencia del domicilio</p>
                    <p className="text-sm text-muted-foreground">
                      {addressDetails?.trim()
                        ? addressDetails
                        : "Sin referencia adicional"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4 sm:col-span-2">
                <div className="flex items-start gap-3">
                  <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Nota del pedido</p>
                    <p className="text-sm text-muted-foreground">
                      {notes?.trim() ? notes : "Sin nota adicional"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border bg-background p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Dirección</p>
                    <p className="text-sm text-muted-foreground">
                      Sarmiento 403
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Día de retiro</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPickupDate(pickupDate)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Horario</p>
                    <p className="text-sm text-muted-foreground">
                      {pickupTimeSlot?.trim()
                        ? pickupTimeSlot
                        : "No seleccionado"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <div className="flex items-start gap-3">
                  <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Nota para el retiro</p>
                    <p className="text-sm text-muted-foreground">
                      {pickupNotes?.trim()
                        ? pickupNotes
                        : "Sin nota adicional"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-dashed bg-muted/20 p-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Revisá bien estos datos antes de confirmar el pedido. Después vas a
              poder consultar esta información desde tu cuenta.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}