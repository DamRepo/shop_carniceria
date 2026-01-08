'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Home, ShoppingBag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function OrderConfirmedContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams?.get?.('orderNumber');

  return (
    <div className="container mx-auto max-w-3xl px-4 py-20">
      <Card>
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="h-20 w-20 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">¡Pedido confirmado!</h1>
            <p className="text-muted-foreground text-lg">
              Tu pedido fue recibido exitosamente
            </p>
          </div>

          {orderNumber && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Número de pedido</p>
              <p className="text-2xl font-bold font-mono">{orderNumber}</p>
            </div>
          )}

          <div className="space-y-2 text-left bg-muted/50 p-4 rounded-lg">
            <p className="font-medium">¿Qué sigue?</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Procesaremos tu pedido a la brevedad</li>
              <li>Te contactaremos al número que proporcionaste</li>
              <li>Prepararemos tu pedido con el mayor cuidado</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/">
              <Button variant="outline" size="lg">
                <Home className="mr-2 h-4 w-4" />
                Volver al inicio
              </Button>
            </Link>
            <Link href="/productos">
              <Button size="lg">
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
    <Suspense fallback={
      <div className="container mx-auto max-w-3xl px-4 py-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <OrderConfirmedContent />
    </Suspense>
  );
}
