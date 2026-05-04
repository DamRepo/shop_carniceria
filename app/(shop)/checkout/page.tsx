"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ShoppingCart, ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store";
import { useCheckoutStore } from "@/lib/checkout-store";
import { netFromGrossCents } from "@/lib/utils-format";
import { toast } from "sonner";

import { ContactStep } from "@/components/checkout/contact-step";
import { DeliveryStep } from "@/components/checkout/delivery-step";
import { PickupStep } from "@/components/checkout/pickup-step";
import { CheckoutDetails } from "@/components/checkout/checkout-details";
import { CheckoutSummary } from "@/components/checkout/checkout-summary";
import type { CheckoutFormData } from "@/components/checkout/types";
import { DeliveryAddressStep } from "@/components/checkout/delivery-address-step";
import { getShippingCost, isValidShippingZone } from "@/lib/shipping";

const PICKUP_TIME_SLOTS = [
  "07:30 a 09:30",
  "09:30 a 11:30",
  "11:30 a 13:00",
  "16:00 a 18:00",
  "18:00 a 21:00",
];

function getTodayLocalDateString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const items = useCartStore((state) => state?.items);
  const checkoutTotal = useCartStore((state) => state?.getTotalPrice?.() ?? 0);
  const storedFormData = useCheckoutStore((s) => s.formData);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  const [formData, setFormData] = useState<CheckoutFormData>({
    customerName: "",
    phone: "",
    email: "",
    deliveryMethod: "PICKUP",
    deliveryZone: "",
    address: "",
    addressDetails: "",
    notes: "",
    pickupDate: "",
    pickupTimeSlot: "",
    pickupNotes: "",
  });

  // Restore form from checkout store when navigating back from metodo-pago
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || !storedFormData) return;
    restoredRef.current = true;
    setFormData((prev) => ({
      customerName: storedFormData.customerName || prev.customerName,
      phone: storedFormData.phone || prev.phone,
      email: storedFormData.email || prev.email,
      deliveryMethod: storedFormData.deliveryMethod || prev.deliveryMethod,
      deliveryZone: storedFormData.deliveryZone || prev.deliveryZone,
      address: storedFormData.address || prev.address,
      addressDetails: storedFormData.addressDetails || prev.addressDetails,
      notes: storedFormData.notes || prev.notes,
      pickupDate: storedFormData.pickupDate || prev.pickupDate,
      pickupTimeSlot: storedFormData.pickupTimeSlot || prev.pickupTimeSlot,
      pickupNotes: storedFormData.pickupNotes || prev.pickupNotes,
    }));
  }, [storedFormData]);

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
          next.deliveryZone = "";
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

  const isGuest = status !== "authenticated" && status !== "loading";

  const validateContactStep = () => {
    if (!formData.customerName.trim() || !formData.phone.trim()) {
      toast.error("Por favor completá nombre y teléfono");
      return false;
    }

    if (isGuest && !formData.email?.trim()) {
      toast.error("Por favor ingresá tu email para recibir la confirmación del pedido");
      return false;
    }

    return true;
  };

  const validateDeliveryDetailsStep = () => {
    if (formData.deliveryMethod === "DELIVERY") {
      if (!formData.deliveryZone) {
        toast.error("Seleccioná la zona de envío");
        return false;
      }

      if (!formData.address.trim()) {
        toast.error("Ingresá la dirección para el delivery");
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

  const subtotal = checkoutTotal;
  const deliveryCost =
    formData.deliveryMethod === "DELIVERY" &&
    isValidShippingZone(formData.deliveryZone)
      ? getShippingCost(formData.deliveryZone)
      : 0;
  const total = subtotal + deliveryCost;

  const subtotalNet = (items ?? []).reduce((sum, item) => {
    const itemTotal = (item.price ?? 0) * (item.quantity ?? 0);
    const vatRate = item.vatRate ?? 0.21;
    return sum + netFromGrossCents(itemTotal, vatRate);
  }, 0);

  const handleContinueToPay = () => {
    if ((items?.length ?? 0) === 0) {
      toast.error("Tu carrito está vacío");
      return;
    }

    if (!validateContactStep()) return;
    if (!validateDeliveryDetailsStep()) return;

    useCheckoutStore.getState().setFormData(formData);
    useCheckoutStore.getState().setTotals({ subtotal, subtotalNet, deliveryCost, total });

    router.push("/checkout/metodo-pago");
  };

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
            Completá tus datos y elegí cómo recibir tu pedido.
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
              disabled={false}
              isGuest={isGuest}
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
                disabled={false}
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
                disabled={false}
              />
            ))}

          {currentStep === 4 && (
            <CheckoutDetails
              items={items ?? []}
              deliveryMethod={formData.deliveryMethod}
              address={
                formData.deliveryMethod === "DELIVERY" ? formData.address : ""
              }
              addressDetails={
                formData.deliveryMethod === "DELIVERY"
                  ? formData.addressDetails
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
            canPay={currentStep === 4}
            onBack={currentStep === 4 ? () => setCurrentStep(3) : undefined}
            onContinue={handleContinueToPay}
          />
        </div>
      </div>
    </div>
  );
}
