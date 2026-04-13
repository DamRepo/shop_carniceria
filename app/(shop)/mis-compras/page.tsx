import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatQuantity } from "@/lib/utils-format";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RepeatOrderButton } from "@/components/repeat-order-button";

export const dynamic = "force-dynamic";

type OrderItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product?: { id: string; name: string; slug: string; unitType: "PER_KG" | "PER_UNIT" } | null;
};

type Order = {
  id: string;
  orderNumber: string;
  status:
  | "PENDING_PAYMENT"
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";
  paymentStatus: "PENDING" | "PENDING_LOCAL" | "PAID" | "FAILED" | "CANCELLED";
  paymentMethod: "MERCADO_PAGO" | "CASH";
  deliveryMethod: "PICKUP" | "DELIVERY";
  total: number;
  createdAt: string;
  pickupDate?: string | null;
  pickupTimeSlot?: string | null;
  pickupNotes?: string | null;
  address?: string | null;
  items: OrderItem[];
};

function formatARS(cents: number) {
  const pesos = (cents ?? 0) / 100;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(pesos);
}

function formatDate(dateIso: string) {
  const d = new Date(dateIso);
  return d.toLocaleString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPickupDate(dateIso?: string | null) {
  if (!dateIso) return null;
  const d = new Date(dateIso);
  return d.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}



function statusLabel(s: Order["status"]) {
  switch (s) {
    case "PENDING_PAYMENT":
      return "Pendiente de pago";
    case "PENDING":
      return "Pendiente";
    case "CONFIRMED":
      return "Confirmado";
    case "PREPARING":
      return "Preparando";
    case "READY":
      return "Listo para retirar";
    case "COMPLETED":
      return "Entregado";
    case "CANCELLED":
      return "Cancelado";
    default:
      return s;
  }
}

function paymentLabel(ps: Order["paymentStatus"], pm: Order["paymentMethod"]) {
  if (pm === "CASH") {
    return ps === "PENDING" || ps === "PENDING_LOCAL"
      ? "Pago pendiente en local"
      : "Pago en local";
  }

  switch (ps) {
    case "PAID":
      return "Pagado";
    case "FAILED":
      return "Pago fallido";
    case "PENDING":
    case "PENDING_LOCAL":
      return "Pago pendiente";
    case "CANCELLED":
      return "Pago cancelado";
    default:
      return ps;
  }
}

function badgeVariantForStatus(status: Order["status"]) {
  switch (status) {
    case "READY":
    case "COMPLETED":
      return "default";
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
}

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() || undefined;
}

function normalizePhone(phone?: string) {
  return phone?.trim() || undefined;
}

async function getOrdersForSession(args: {
  userId?: string;
  email?: string;
  phone?: string;
}): Promise<Order[]> {
  const userId = args.userId?.trim() || undefined;
  const email = normalizeEmail(args.email);
  const phone = normalizePhone(args.phone);

  const OR: { userId?: string | null; email?: string; phone?: string }[] = [];

  if (userId) OR.push({ userId });
  if (email) OR.push({ userId: null, email });
  if (phone) OR.push({ userId: null, phone });

  if (OR.length === 0) return [];

  const orders = await prisma.order.findMany({
    where: { OR },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (orders as any[]).map((o: any) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status as Order["status"],
    paymentStatus: o.paymentStatus as Order["paymentStatus"],
    paymentMethod: o.paymentMethod as Order["paymentMethod"],
    deliveryMethod: o.deliveryMethod,
    total: o.total,
    createdAt: o.createdAt.toISOString(),
    pickupDate: o.pickupDate ? o.pickupDate.toISOString() : null,
    pickupTimeSlot: o.pickupTimeSlot ?? null,
    pickupNotes: o.pickupNotes ?? null,
    address: o.address ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: (o.items ?? []).map((it: any) => ({
      id: it.id,
      quantity: Number(it.quantity ?? 0),
      unitPrice: it.unitPrice,
      lineTotal: it.lineTotal,
      product: it.product
        ? {
          id: it.product.id,
          name: it.product.name,
          slug: it.product.slug,
          unitType: it.product.unitType as "PER_KG" | "PER_UNIT",
        }
        : null,
    })),
  }));
}

export default async function MisComprasPage() {
  const session = await getServerSession(authOptions);

  const userId = (session?.user as any)?.id as string | undefined;
  const email = session?.user?.email ?? undefined;
  const phone = (session?.user as any)?.phone as string | undefined;

  if (!userId && !email && !phone) {
    redirect("/auth/login");
  }

  const orders = await getOrdersForSession({ userId, email, phone });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mis compras</h1>
          <p className="text-muted-foreground">
            Acá vas a ver tus pedidos y su estado.
          </p>
        </div>

        <Link href="/productos">
          <Button>Seguir comprando</Button>
        </Link>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No tenés compras todavía</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Cuando hagas un pedido, va a aparecer acá con el mismo código que ve el
              administrador.
            </p>
            <Link href="/productos">
              <Button>Ver productos</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Card key={o.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl">
                    Orden <span className="font-mono">#{o.orderNumber}</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(o.createdAt)}
                  </p>
                </div>

                <div className="space-y-2 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge variant={badgeVariantForStatus(o.status)}>
                      {statusLabel(o.status)}
                    </Badge>
                    <Badge variant="outline">
                      {paymentLabel(o.paymentStatus, o.paymentMethod)}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold">{formatARS(o.total)}</div>
                  <RepeatOrderButton
                    items={o.items.map((it) => ({
                      productId: it.product?.id ?? "",
                      slug: it.product?.slug,
                      quantity: it.quantity,
                      unitType: it.product?.unitType ?? "PER_UNIT",
                      name: it.product?.name ?? "Producto",
                    }))}
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-lg border p-3">
                  <div className="text-sm font-medium mb-2">Entrega</div>

                  {o.deliveryMethod === "PICKUP" ? (
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Método:</span> Retiro en local
                      </p>
                      {o.pickupDate && (
                        <p>
                          <span className="font-medium">Día:</span>{" "}
                          {formatPickupDate(o.pickupDate)}
                        </p>
                      )}
                      {o.pickupTimeSlot && (
                        <p>
                          <span className="font-medium">Horario:</span>{" "}
                          {o.pickupTimeSlot}
                        </p>
                      )}
                      {o.pickupNotes && (
                        <p>
                          <span className="font-medium">Nota:</span>{" "}
                          {o.pickupNotes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Método:</span> Envío a domicilio
                      </p>
                      {o.address && (
                        <p>
                          <span className="font-medium">Dirección:</span>{" "}
                          {o.address}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-sm font-medium">
                  Productos ({o.items?.length ?? 0})
                </div>

                <div className="space-y-2">
                  {(o.items ?? []).map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="min-w-0">
                        <div className="line-clamp-1 font-medium">
                          {it.product?.name ?? "Producto"}
                        </div>
                        <div className="text-muted-foreground">
                          Cantidad: {formatQuantity(it.quantity, it.product?.unitType ?? "PER_UNIT")}
                        </div>
                      </div>
                      <div className="font-medium">{formatARS(it.lineTotal)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}