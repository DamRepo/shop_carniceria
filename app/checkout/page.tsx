'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice, formatQuantity } from '@/lib/utils-format';
import { useCartStore } from '@/lib/store';
import { toast } from 'sonner';
import { Loader2, Package, Truck, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

interface FormData {
  customerName: string;
  phone: string;
  email: string;
  deliveryMethod: 'PICKUP' | 'DELIVERY' | '';
  address: string;
  addressDetails: string;
  city: string;
  postalCode: string;
  notes: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((state) => state?.items);
  const clearCart = useCartStore((state) => state?.clearCart);
  const getTotalPrice = useCartStore((state) => state?.getTotalPrice);

  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    phone: '',
    email: '',
    deliveryMethod: '',
    address: '',
    addressDetails: '',
    city: '',
    postalCode: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.();

    // Validaciones
    if (!formData?.customerName || !formData?.phone || !formData?.deliveryMethod) {
      toast?.error?.('Por favor completá todos los campos obligatorios');
      return;
    }

    if (formData?.deliveryMethod === 'DELIVERY' && !formData?.address) {
      toast?.error?.('Por favor ingresá tu dirección de envío');
      return;
    }

    if ((items?.length ?? 0) === 0) {
      toast?.error?.('Tu carrito está vacío');
      return;
    }

    setSubmitting(true);

    try {
      const orderItems = items?.map?.((item) => ({
        productId: item?.id ?? '',
        quantity: item?.quantity ?? 0,
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          items: orderItems,
        }),
      });

      if (res?.ok) {
        const order = await res?.json?.();
        toast?.success?.('¡Pedido realizado con éxito!');
        clearCart?.();
        router?.push?.(`/orden-confirmada?orderNumber=${order?.orderNumber ?? ''}`);
      } else {
        const error = await res?.json?.();
        toast?.error?.(error?.error ?? 'Error al procesar el pedido');
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      toast?.error?.('Error al procesar el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal = getTotalPrice?.() ?? 0;
  const deliveryCost = formData?.deliveryMethod === 'DELIVERY' ? 50000 : 0; // $500
  const total = subtotal + deliveryCost;

  if ((items?.length ?? 0) === 0) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-20">
        <div className="text-center space-y-4">
          <ShoppingCart className="h-24 w-24 mx-auto text-muted-foreground" />
          <h1 className="text-3xl font-bold">Tu carrito está vacío</h1>
          <p className="text-muted-foreground text-lg">
            Agregá productos para continuar con el pedido
          </p>
          <Link href="/productos">
            <Button size="lg" className="mt-4">
              Ver productos
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Finalizar Pedido</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario */}
          <div className="lg:col-span-2 space-y-6">
            {/* Datos del cliente */}
            <Card>
              <CardHeader>
                <CardTitle>Datos de contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Nombre completo *</Label>
                    <Input
                      id="customerName"
                      value={formData?.customerName ?? ''}
                      onChange={(e) => handleInputChange('customerName', e?.target?.value ?? '')}
                      required
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData?.phone ?? ''}
                      onChange={(e) => handleInputChange('phone', e?.target?.value ?? '')}
                      required
                      placeholder="11 1234-5678"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (opcional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData?.email ?? ''}
                    onChange={(e) => handleInputChange('email', e?.target?.value ?? '')}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Método de entrega */}
            <Card>
              <CardHeader>
                <CardTitle>Método de entrega</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryMethod">Seleccioná cómo querés recibir tu pedido *</Label>
                  <Select
                    value={formData?.deliveryMethod ?? ''}
                    onValueChange={(value) => handleInputChange('deliveryMethod', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PICKUP">
                        <div className="flex items-center">
                          <Package className="mr-2 h-4 w-4" />
                          Retiro en local (sin cargo)
                        </div>
                      </SelectItem>
                      <SelectItem value="DELIVERY">
                        <div className="flex items-center">
                          <Truck className="mr-2 h-4 w-4" />
                          Envío a domicilio (+$500)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData?.deliveryMethod === 'DELIVERY' && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="address">Dirección *</Label>
                      <Input
                        id="address"
                        value={formData?.address ?? ''}
                        onChange={(e) => handleInputChange('address', e?.target?.value ?? '')}
                        required={formData?.deliveryMethod === 'DELIVERY'}
                        placeholder="Av. Corrientes 1234"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addressDetails">Detalles (piso, dpto, etc.)</Label>
                      <Input
                        id="addressDetails"
                        value={formData?.addressDetails ?? ''}
                        onChange={(e) => handleInputChange('addressDetails', e?.target?.value ?? '')}
                        placeholder="Piso 3, Dpto B"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">Localidad</Label>
                        <Input
                          id="city"
                          value={formData?.city ?? ''}
                          onChange={(e) => handleInputChange('city', e?.target?.value ?? '')}
                          placeholder="Buenos Aires"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Código postal</Label>
                        <Input
                          id="postalCode"
                          value={formData?.postalCode ?? ''}
                          onChange={(e) => handleInputChange('postalCode', e?.target?.value ?? '')}
                          placeholder="1234"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {formData?.deliveryMethod === 'PICKUP' && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Dirección de retiro:</p>
                    <p className="text-sm text-muted-foreground">
                      Av. Corrientes 1234, Buenos Aires
                      <br />
                      Lunes a Sábado: 8:00 - 20:00 | Domingos: 8:00 - 13:00
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notas adicionales */}
            <Card>
              <CardHeader>
                <CardTitle>Notas adicionales (opcional)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData?.notes ?? ''}
                  onChange={(e) => handleInputChange('notes', e?.target?.value ?? '')}
                  placeholder="Dejanos cualquier comentario sobre tu pedido..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Resumen del pedido */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Resumen del pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {items?.map?.((item) => (
                    <div key={item?.id ?? ''} className="flex justify-between text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-clamp-1">{item?.name ?? 'Producto'}</p>
                        <p className="text-muted-foreground">
                          {formatQuantity(item?.quantity ?? 0, item?.unitType ?? 'PER_UNIT')}
                        </p>
                      </div>
                      <p className="font-medium ml-2">
                        {formatPrice(((item?.price ?? 0) * (item?.quantity ?? 0)))}
                      </p>
                    </div>
                  )) ?? null}
                </div>

                {/* Totales */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envío</span>
                    <span>{deliveryCost > 0 ? formatPrice(deliveryCost) : 'Gratis'}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xl font-bold pt-4 border-t">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Confirmar pedido'
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Al confirmar, aceptas nuestros términos y condiciones
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
