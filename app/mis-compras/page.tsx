import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type OrderItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product?: { id: string; name: string; unitType: "PER_KG" | "PER_UNIT" } | null;
};

type Order = {
  id: string;
  orderNumber: string;
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  paymentStatus: "PENDING" | "PENDING_LOCAL" | "PAID" | "FAILED";
  paymentMethod: "MERCADO_PAGO" | "CASH";
  total: number; // cents
  createdAt: string; // ISO
  items: OrderItem[];
};

function formatARS(cents: number) {
  const pesos = (cents ?? 0) / 100;
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(pesos);
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

function statusLabel(s: Order["status"]) {
  switch (s) {
    case "PENDING":
      return "Pendiente";
    case "CONFIRMED":
      return "Confirmado";
    case "PREPARING":
      return "Preparando";
    case "READY":
      return "Listo";
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
    return ps === "PENDING_LOCAL" ? "Pago pendiente en local" : "Pago en local";
  }
  switch (ps) {
    case "PAID":
      return "Pagado";
    case "FAILED":
      return "Pago fallido";
    case "PENDING":
      return "Pago pendiente";
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

async function getOrdersForSession(args: { userId?: string; email?: string; phone?: string }): Promise<Order[]> {
  const OR: any[] = [];

  // ✅ Órdenes asociadas al usuario
  if (args.userId) OR.push({ userId: args.userId });

  // ✅ Órdenes guest por email (solo si userId está null)
  if (args.email) OR.push({ userId: null, email: args.email });

  // ✅ Órdenes guest por teléfono (solo si userId está null)
  if (args.phone) OR.push({ userId: null, phone: args.phone });

  // Si por alguna razón no hay nada para buscar, devolvemos []
  if (OR.length === 0) return [];

  const orders = await prisma.order.findMany({
    where: { OR },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status as Order["status"],
    paymentStatus: o.paymentStatus as Order["paymentStatus"],
    paymentMethod: o.paymentMethod as Order["paymentMethod"],
    total: o.total,
    createdAt: o.createdAt.toISOString(),
    items: (o.items ?? []).map((it) => ({
      id: it.id,
      quantity: Number(it.quantity ?? 0),
      unitPrice: it.unitPrice,
      lineTotal: it.lineTotal,
      product: it.product
        ? {
            id: it.product.id,
            name: it.product.name,
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

  // antes pedías userId sí o sí; ahora aceptamos también email/phone
  if (!userId && !email && !phone) redirect("/auth/login");

  const orders = await getOrdersForSession({ userId, email, phone });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Mis compras</h1>
          <p className="text-muted-foreground">Acá vas a ver tus pedidos y su estado.</p>
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
              Cuando hagas un pedido, va a aparecer acá con el mismo código que ve el administrador.
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
                  <p className="text-sm text-muted-foreground">{formatDate(o.createdAt)}</p>
                </div>

                <div className="text-right space-y-2">
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    <Badge variant={badgeVariantForStatus(o.status)}>{statusLabel(o.status)}</Badge>
                    <Badge variant="outline">{paymentLabel(o.paymentStatus, o.paymentMethod)}</Badge>
                  </div>
                  <div className="text-2xl font-bold">{formatARS(o.total)}</div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="text-sm font-medium">Productos ({o.items?.length ?? 0})</div>

                <div className="space-y-2">
                  {(o.items ?? []).map((it) => (
                    <div key={it.id} className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <div className="font-medium line-clamp-1">{it.product?.name ?? "Producto"}</div>
                        <div className="text-muted-foreground">Cantidad: {Number(it.quantity ?? 0)}</div>
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