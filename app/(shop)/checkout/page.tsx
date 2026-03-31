"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ShoppingCart, ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store";
import { netFromGrossCents } from "@/lib/utils-format";
import { toast } from "sonner";

import { ContactStep } from "@/components/checkout/contact-step";
import { DeliveryStep } from "@/components/checkout/delivery-step";
import { PickupStep } from "@/components/checkout/pickup-step";
import { CheckoutDetails } from "@/components/checkout/checkout-details";
import { CheckoutSummary } from "@/components/checkout/checkout-summary";
import type { CheckoutFormData } from "@/components/checkout/types";
import { DeliveryAddressStep } from "@/components/checkout/delivery-address-step";

const PICKUP_TIME_SLOTS = [
  "07:30 a 09:30",
  "09:30 a 11:30",
  "11:30 a 13:00",
  "17:00 a 19:00",
  "19:00 a 22:00",
];

//  precios en centavos, $1200 = 120000
const DELIVERY_COST = 120000;

function getTodayLocalDateString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

type CartItemLike = {
  id: string;
  quantity: number;
  unitType?: "PER_KG" | "PER_UNIT";
  price?: number;
  vatRate?: number;
};

function normalizeCheckoutQuantity(item: CartItemLike) {
  const qty = Number(item.quantity ?? 0);

  if (!Number.isFinite(qty) || qty <= 0) return 0;


  if (item.unitType === "PER_KG") {
    return qty;
  }

  return qty;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const items = useCartStore((state) => state?.items);
  const checkoutTotal = useCartStore((state) => state?.getTotalPrice?.() ?? 0);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<CheckoutFormData>({
    customerName: "",
    phone: "",
    email: "",
    deliveryMethod: "PICKUP",
    address: "",
    addressDetails: "",
    city: "",
    postalCode: "",
    notes: "",
    pickupDate: "",
    pickupTimeSlot: "",
    pickupNotes: "",
  });

  useEffect(() => {
    if (status !== "authenticated") return;

    setFormData((prev) => {
      const next = { ...prev };

      if (!next.customerName && session?.user?.name) {
        next.customerName = session.user.name;
      }

      if (!next.email && session?.user?.email) {
        next.email = session.user.email;
      }

      const phone = (session?.user as any)?.phone as string | null | undefined;
      if (!next.phone && phone) {
        next.phone = phone;
      }

      return next;
    });
  }, [status, session]);

  const handleInputChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "deliveryMethod") {
        if (value === "PICKUP") {
          next.address = "";
          next.addressDetails = "";
          next.city = "";
          next.postalCode = "";
        }

        if (value === "DELIVERY") {
          next.pickupDate = "";
          next.pickupTimeSlot = "";
          next.pickupNotes = "";
        }
      }

      return next;
    });
  };

  const validateContactStep = () => {
    if (!formData.customerName.trim() || !formData.phone.trim()) {
      toast.error("Por favor completá nombre y teléfono");
      return false;
    }

    return true;
  };

  const validateDeliveryDetailsStep = () => {
    if (formData.deliveryMethod === "DELIVERY") {
      if (!formData.address.trim()) {
        toast.error("Ingresá la dirección para el delivery");
        return false;
      }

      if (!formData.city.trim()) {
        toast.error("Ingresá la ciudad del delivery");
        return false;
      }

      return true;
    }

    if (formData.deliveryMethod === "PICKUP") {
      if (!formData.pickupDate) {
        toast.error("Seleccioná el día en que vas a retirar el pedido");
        return false;
      }

      if (!formData.pickupTimeSlot) {
        toast.error("Seleccioná un horario de retiro");
        return false;
      }

      return true;
    }

    toast.error("Seleccioná un método de entrega");
    return false;
  };

  const validateCheckoutFinal = () => {
    if ((items?.length ?? 0) === 0) {
      toast.error("Tu carrito está vacío");
      return false;
    }

    if (!validateContactStep()) return false;
    if (!validateDeliveryDetailsStep()) return false;

    return true;
  };

  const buildRequestBody = () => {
    const orderItems = (items ?? [])
      .map((item) => ({
        productId: item.id,
        quantity: normalizeCheckoutQuantity(item as CartItemLike),
      }))
      .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);

    return {
      customerName: formData.customerName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      deliveryMethod: formData.deliveryMethod,
      address:
        formData.deliveryMethod === "DELIVERY" ? formData.address.trim() : "",
      addressDetails:
        formData.deliveryMethod === "DELIVERY"
          ? formData.addressDetails.trim()
          : "",
      city: formData.deliveryMethod === "DELIVERY" ? formData.city.trim() : "",
      postalCode:
        formData.deliveryMethod === "DELIVERY"
          ? formData.postalCode.trim()
          : "",
      notes: formData.notes.trim(),
      pickupDate:
        formData.deliveryMethod === "PICKUP" ? formData.pickupDate : "",
      pickupTimeSlot:
        formData.deliveryMethod === "PICKUP" ? formData.pickupTimeSlot : "",
      pickupNotes:
        formData.deliveryMethod === "PICKUP"
          ? formData.pickupNotes.trim()
          : "",
      items: orderItems,
    };
  };

  const handleMercadoPago = async () => {
    if (!validateCheckoutFinal()) return;

    setSubmitting(true);

    try {
      const res = await fetch("/api/mercadopago/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody()),
      });

      const data = await res.json().catch(() => null);

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

  const handleCashOrder = async () => {
    if (!validateCheckoutFinal()) return;

    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildRequestBody(),
          paymentMethod: "CASH",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(data?.error ?? "No se pudo confirmar el pedido");
        return;
      }

      toast.success(
        formData.deliveryMethod === "DELIVERY"
          ? "Pedido confirmado. Lo recibirás por delivery."
          : "Pedido confirmado. Pagás en el local."
      );

      useCartStore.getState().clearCart();

      const params = new URLSearchParams();

      if (data?.orderNumber) params.set("orderNumber", data.orderNumber);
      if (data?.orderId) params.set("orderId", data.orderId);

      params.set("deliveryMethod", formData.deliveryMethod);
      if (formData.deliveryMethod === "DELIVERY") {
        if (formData.address) params.set("address", formData.address);
        if (formData.addressDetails)
          params.set("addressDetails", formData.addressDetails);
        if (formData.city) params.set("city", formData.city);
        if (formData.postalCode)
          params.set("postalCode", formData.postalCode);
      }

      if (formData.deliveryMethod === "PICKUP") {
        if (formData.pickupDate) params.set("pickupDate", formData.pickupDate);
        if (formData.pickupTimeSlot) {
          params.set("pickupTimeSlot", formData.pickupTimeSlot);
        }
      }

      router.push(`/orden-confirmada?${params.toString()}`);
    } catch (error) {
      console.error("Error creating cash order:", error);
      toast.error("Error al confirmar el pedido");
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal = checkoutTotal;
  const deliveryCost =
    formData.deliveryMethod === "DELIVERY" ? DELIVERY_COST : 0;
  const total = subtotal + deliveryCost;

  const subtotalNet = (items ?? []).reduce((sum, item) => {
    const itemTotal = (item.price ?? 0) * (item.quantity ?? 0);
    const vatRate = item.vatRate ?? 0.21;
    return sum + netFromGrossCents(itemTotal, vatRate);
  }, 0);

  const minPickupDate = useMemo(() => getTodayLocalDateString(), []);

  if ((items?.length ?? 0) === 0) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-16 md:py-24">
        <div className="rounded-3xl border border-border/60 bg-background p-10 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <ShoppingCart className="h-10 w-10 text-muted-foreground" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Tu carrito está vacío
          </h1>

          <p className="mt-3 text-base text-muted-foreground">
            Agregá productos para continuar con tu pedido.
          </p>

          <Link href="/productos" className="mt-8 inline-block">
            <Button size="lg" className="rounded-xl px-8">
              Ver productos
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 md:py-8">
      <div className="mb-5">
        <button
          type="button"
          onClick={() => router.push("/carrito")}
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver al carrito
        </button>

        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/30 px-4 py-4 shadow-sm md:px-6 md:py-5">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Finalizar compra
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Completá tus datos y elegí cómo recibir y pagar tu pedido.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          {currentStep === 1 && (
            <ContactStep
              formData={formData}
              onChange={handleInputChange}
              onContinue={() => {
                if (!validateContactStep()) return;
                setCurrentStep(2);
              }}
              disabled={submitting}
            />
          )}

          {currentStep === 2 && (
            <DeliveryStep
              formData={formData}
              onChange={handleInputChange}
              onBack={() => setCurrentStep(1)}
              onContinue={() => setCurrentStep(3)}
            />
          )}

          {currentStep === 3 &&
            (formData.deliveryMethod === "PICKUP" ? (
              <PickupStep
                formData={formData}
                minPickupDate={minPickupDate}
                pickupTimeSlots={PICKUP_TIME_SLOTS}
                onChange={handleInputChange}
                onBack={() => setCurrentStep(2)}
                onContinue={() => {
                  if (!validateDeliveryDetailsStep()) return;
                  setCurrentStep(4);
                }}
                disabled={submitting}
              />
            ) : (
              <DeliveryAddressStep
                formData={formData}
                onChange={handleInputChange}
                onBack={() => setCurrentStep(2)}
                onContinue={() => {
                  if (!validateDeliveryDetailsStep()) return;
                  setCurrentStep(4);
                }}
                disabled={submitting}
              />
            ))}

          {currentStep === 4 && (
            <CheckoutDetails
              items={items ?? []}
              deliveryMethod={formData.deliveryMethod}
              address={
                formData.deliveryMethod === "DELIVERY"
                  ? formData.address
                  : ""
              }
              addressDetails={
                formData.deliveryMethod === "DELIVERY"
                  ? formData.addressDetails
                  : ""
              }
              city={formData.deliveryMethod === "DELIVERY" ? formData.city : ""}
              postalCode={
                formData.deliveryMethod === "DELIVERY"
                  ? formData.postalCode
                  : ""
              }
              notes={formData.notes}
              pickupDate={
                formData.deliveryMethod === "PICKUP" ? formData.pickupDate : ""
              }
              pickupTimeSlot={
                formData.deliveryMethod === "PICKUP"
                  ? formData.pickupTimeSlot
                  : ""
              }
              pickupNotes={
                formData.deliveryMethod === "PICKUP"
                  ? formData.pickupNotes
                  : ""
              }
            />
          )}
        </div>

        <div className="xl:sticky xl:top-24">
          <CheckoutSummary
            subtotal={subtotal}
            subtotalNet={subtotalNet}
            total={total}
            deliveryCost={deliveryCost}
            deliveryMethod={formData.deliveryMethod}
            submitting={submitting}
            canPay={currentStep === 4}
            onBack={currentStep === 4 ? () => setCurrentStep(3) : undefined}
            onMercadoPago={handleMercadoPago}
            onCashOrder={handleCashOrder}
          />
        </div>
      </div>
    </div>
  );
}