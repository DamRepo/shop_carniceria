import Link from "next/link";
import { prisma } from "@/lib/db";
import { ClearCartOnMount } from "./ClearCartOnMount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils-format";

export const dynamic = "force-dynamic";

export default async function MpSuccessPage({
  searchParams,
}: {
  searchParams: { csId?: string };
}) {
  // Mercado Pago vuelve a la back_url que arma preference/route.ts, que lleva
  // csId (el id de la CheckoutSession). La orden se resuelve a través de ella.
  const csId = searchParams?.csId ?? "";

  const checkoutSession = csId
    ? await prisma.checkoutSession.findUnique({
        where: { id: csId },
        select: {
          order: {
            select: {
              orderNumber: true,
              total: true,
              status: true,
              paymentStatus: true,
            },
          },
        },
      })
    : null;

  const order = checkoutSession?.order ?? null;

  const confirmed =
    order !== null &&
    (order.paymentStatus === "PAID" || order.status === "CONFIRMED");

  const rejected =
    order !== null &&
    !confirmed &&
    (order.paymentStatus === "FAILED" ||
      order.paymentStatus === "CANCELLED" ||
      order.status === "CANCELLED");

  // Sin csId, sin sesión, o sesión sin orden asociada: no hay forma de saber
  // qué pedido mostrar. Ese —y solo ese— es el caso de error real.
  const notFound = order === null;

  const title = notFound
    ? "No encontramos tu pedido"
    : confirmed
      ? "¡Pago aprobado! ✅"
      : rejected
        ? "El pago no se completó ❌"
        : "Estamos confirmando tu pago... ⏳";

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      {confirmed ? <ClearCartOnMount /> : null}

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
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

              {confirmed ? (
                <div className="flex gap-3">
                  <Link href={`/orden-confirmada?orderNumber=${order.orderNumber}`}>
                    <Button>Ver confirmación</Button>
                  </Link>
                  <Link href="/productos">
                    <Button variant="outline">Seguir comprando</Button>
                  </Link>
                </div>
              ) : rejected ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No se pudo acreditar el pago. No te cobramos nada.
                  </p>

                  <div className="flex gap-3">
                    <Link href="/checkout">
                      <Button>Reintentar</Button>
                    </Link>
                    <Link href="/carrito">
                      <Button variant="outline">Volver al carrito</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Mercado Pago ya aprobó el pago y estamos terminando de
                    registrarlo. Esto puede tardar unos segundos.
                  </p>

                  <div className="flex gap-3">
                    <Button asChild variant="outline">
                      <Link href={`/checkout/mp/success?csId=${csId}`}>
                        Actualizar estado
                      </Link>
                    </Button>

                    <Button asChild>
                      <Link href="/mis-compras">Ver mis compras</Link>
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <p>
                No pudimos identificar tu pedido desde este enlace. Si ya
                pagaste, el pedido igual quedó registrado: escribinos por
                WhatsApp y lo verificamos.
              </p>
              <div className="flex gap-3">
                <Link href="/mis-compras">
                  <Button>Ver mis compras</Button>
                </Link>
                <Link href="/productos">
                  <Button variant="outline">Volver a productos</Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
