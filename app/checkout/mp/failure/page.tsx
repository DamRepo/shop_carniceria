import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MpFailurePage({
  searchParams,
}: {
  searchParams: { orderId?: string };
}) {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Pago rechazado ❌</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>El pago no se pudo completar.</p>
          <div className="flex gap-3">
            <Link href="/checkout">
              <Button>Reintentar</Button>
            </Link>
            <Link href="/carrito">
              <Button variant="outline">Volver al carrito</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
