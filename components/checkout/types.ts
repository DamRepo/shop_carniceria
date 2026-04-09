import type { ShippingZone } from "@/lib/shipping";

export interface CheckoutFormData {
  customerName: string;
  phone: string;
  email: string;
  deliveryMethod: "PICKUP" | "DELIVERY";
  deliveryZone: ShippingZone | "";
  address: string;
  addressDetails: string;
  notes: string;
  pickupDate: string;
  pickupTimeSlot: string;
  pickupNotes: string;
}