import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MpPendingPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Pago pendiente ⏳</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Tu pago está en revisión o pendiente de confirmación.</p>
          <div className="flex gap-3">
            <Link href="/productos">
              <Button>Volver a productos</Button>
            </Link>
            <Link href="/checkout">
              <Button variant="outline">Volver al checkout</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
