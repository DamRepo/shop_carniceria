import Link from "next/link";
import { prisma } from "@/lib/db";
import { ClearCartOnMount } from "./ClearCartOnMount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils-format";

export const dynamic = "force-dynamic";

function isConfirmed(status: string) {
  return status === "CONFIRMED";
}

export default async function MpSuccessPage({
  searchParams,
}: {
  searchParams: { orderId?: string };
}) {
  const orderId = searchParams?.orderId ?? "";

  const order = orderId
    ? await prisma.order.findUnique({
        where: { id: orderId },
        select: { orderNumber: true, total: true, status: true },
      })
    : null;

  const confirmed = order?.status ? isConfirmed(order.status) : false;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      {/* ✅ Limpia carrito SOLO cuando ya está confirmado */}
      {confirmed ? <ClearCartOnMount /> : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {confirmed ? "Pago aprobado ✅" : "Estamos confirmando tu pago… ⏳"}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {order ? (
            <>
              <p>
                Orden: <b>{order.orderNumber}</b>
              </p>
              <p>
                Total: <b>{formatPrice(order.total)}</b>
              </p>
              <p>
                Estado en sistema: <b>{order.status}</b>
              </p>

              {!confirmed ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Mercado Pago te redirigió correctamente. Ahora estamos esperando la
                    confirmación final por webhook (puede tardar unos segundos).
                  </p>

                  {/* 🔁 refresh simple (sin componente extra) */}
                  <div className="flex gap-3">
                    <Button asChild variant="outline">
                      <Link href={`/checkout/mp/success?orderId=${orderId}`}>
                        Actualizar estado
                      </Link>
                    </Button>

                    <Button asChild>
                      <Link href="/checkout">Volver al checkout</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Link href={`/orden-confirmada?orderNumber=${order.orderNumber}`}>
                    <Button>Ver confirmación</Button>
                  </Link>
                  <Link href="/productos">
                    <Button variant="outline">Seguir comprando</Button>
                  </Link>
                </div>
              )}
            </>
          ) : (
            <>
              <p>No pude leer la orden (falta orderId en la URL).</p>
              <Link href="/productos">
                <Button>Volver a productos</Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-4">
        Nota: el estado final se confirma por webhook. Si el estado queda en PENDING,
        tocá “Actualizar estado”.
      </p>
    </div>
  );
}
