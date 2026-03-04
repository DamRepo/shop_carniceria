"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice, formatQuantity, netFromGrossCents } from "@/lib/utils-format";
import { useCartStore } from "@/lib/store";
import { toast } from "sonner";
import { Loader2, Package, ShoppingCart } from "lucide-react";
import Link from "next/link";

interface FormData {
  customerName: string;
  phone: string;
  email: string;
  deliveryMethod: "PICKUP"; // ✅ solo retiro
  address: string;
  addressDetails: string;
  city: string;
  postalCode: string;
  notes: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const items = useCartStore((state) => state?.items);
  const getTotalPrice = useCartStore((state) => state?.getTotalPrice);

  const [formData, setFormData] = useState<FormData>({
    customerName: "",
    phone: "",
    email: "",
    deliveryMethod: "PICKUP", // ✅ fijo
    address: "",
    addressDetails: "",
    city: "",
    postalCode: "",
    notes: "",
  });

  // ✅ Prefill si está logueado (sin pisar lo que el usuario ya escribió)
  useEffect(() => {
    if (status !== "authenticated") return;

    setFormData((prev) => {
      const next = { ...prev };

      if (!next.customerName && session?.user?.name) next.customerName = session.user.name;
      if (!next.email && session?.user?.email) next.email = session.user.email;

      const phone = (session.user as any)?.phone as string | null | undefined;
      if (!next.phone && phone) next.phone = phone;

      return next;
    });
  }, [status, session]);

  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ✅ PAGO ONLINE (Mercado Pago)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.customerName || !formData.phone) {
      toast.error("Por favor completá todos los campos obligatorios");
      return;
    }

    if ((items?.length ?? 0) === 0) {
      toast.error("Tu carrito está vacío");
      return;
    }

    setSubmitting(true);

    try {
      const orderItems = (items ?? []).map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      }));

      // ✅ Crear preferencia de Mercado Pago y redirigir
      const res = await fetch("/api/mercadopago/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData, // incluye deliveryMethod: "PICKUP"
          items: orderItems,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error ?? "No se pudo iniciar el pago");
        return;
      }

      const initPoint = data?.initPoint as string | undefined;
      if (!initPoint) {
        toast.error("Mercado Pago no devolvió el link de pago");
        return;
      }

      window.location.href = initPoint;
    } catch (error) {
      console.error("Error starting MercadoPago:", error);
      toast.error("Error al iniciar el pago");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ PAGO EN LOCAL (EFECTIVO / EN MOSTRADOR)
  const handleCashOrder = async () => {
    // Validaciones
    if (!formData.customerName || !formData.phone) {
      toast.error("Por favor completá todos los campos obligatorios");
      return;
    }

    if ((items?.length ?? 0) === 0) {
      toast.error("Tu carrito está vacío");
      return;
    }

    setSubmitting(true);

    try {
      const orderItems = (items ?? []).map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      }));

      // ✅ Crear pedido SIN Mercado Pago (tu API debe crear Order + items)
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData, // deliveryMethod: "PICKUP"
          items: orderItems,
          paymentMethod: "CASH", // 👈 tu API puede usar esto
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error ?? "No se pudo confirmar el pedido");
        return;
      }

      toast.success("Pedido confirmado. Pagás en el local.");

      // ✅ limpiar carrito
      useCartStore.getState().clearCart();

      // ✅ redirigir a confirmación (tu API debe devolver orderId)
      const orderId = data?.orderId as string | undefined;
      router.push(orderId ? `/orden-confirmada?orderId=${orderId}` : "/orden-confirmada");
      router.refresh();
    } catch (error) {
      console.error("Error creating cash order:", error);
      toast.error("Error al confirmar el pedido");
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal = getTotalPrice?.() ?? 0;
  const deliveryCost = 0; // ✅ sin envío
  const total = subtotal + deliveryCost;

  // ✅ Neto (sin impuestos nacionales) sumado por ítem (correcto con IVA mixto)
  const subtotalNet = (items ?? []).reduce((sum, item) => {
    const itemTotal = (item.price ?? 0) * (item.quantity ?? 0);
    const vatRate = item.vatRate ?? 0.21;
    return sum + netFromGrossCents(itemTotal, vatRate);
  }, 0);

  const totalNet = subtotalNet; // como no hay envío

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
                      value={formData.customerName}
                      onChange={(e) => handleInputChange("customerName", e.target.value)}
                      required
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
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
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Método de entrega (solo retiro) */}
            <Card>
              <CardHeader>
                <CardTitle>Método de entrega</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center mb-2">
                    <Package className="mr-2 h-4 w-4" />
                    <p className="text-sm font-medium">Retiro en local (sin cargo)</p>
                  </div>

                  <p className="text-sm font-medium mb-1">Dirección de retiro:</p>
                  <p className="text-sm text-muted-foreground">
                    Sarmiento 403
                    <br />
                    Lunes a Sábado: 07:30 - 13:00 y 17:00 - 22:00 | Domingos: 8:00 - 13:00
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Notas adicionales */}
            <Card>
              <CardHeader>
                <CardTitle>Notas adicionales (opcional)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
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
                  {(items ?? []).map((item) => {
                    const itemTotal = (item.price ?? 0) * (item.quantity ?? 0);
                    const vatRate = item.vatRate ?? 0.21;
                    const itemNet = netFromGrossCents(itemTotal, vatRate);

                    return (
                      <div key={item.id} className="flex justify-between text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium line-clamp-1">{item.name ?? "Producto"}</p>
                          <p className="text-muted-foreground">
                            {formatQuantity(item.quantity ?? 0, item.unitType ?? "PER_KG")}
                          </p>

                          {/* ✅ NUEVO: neto por ítem */}
                          <p className="text-[11px] text-muted-foreground">
                            PRECIO SIN IMPUESTOS NACIONALES: {formatPrice(itemNet)}
                          </p>
                        </div>

                        <p className="font-medium ml-2">{formatPrice(itemTotal)}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Totales */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>

                  {/* ✅ NUEVO: neto subtotal */}
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">PRECIO SIN IMPUESTOS NACIONALES</span>
                    <span className="text-muted-foreground">{formatPrice(subtotalNet)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envío</span>
                    <span>Gratis</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(total)}</span>
                  </div>

                  {/* ✅ NUEVO: neto total */}
                  
                </div>

                {/* ✅ Pago online */}
                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    "Pagar con Mercado Pago"
                  )}
                </Button>

                {/* ✅ Pago en local */}
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="w-full"
                  disabled={submitting}
                  onClick={handleCashOrder}
                >
                  Confirmar pedido y pagar en el local
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Al confirmar, aceptas nuestros términos y condiciones
                </p>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.push("/carrito")}
                >
                  Volver al carrito
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}