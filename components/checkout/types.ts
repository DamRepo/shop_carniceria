export interface CheckoutFormData {
  customerName: string;
  phone: string;
  email: string;
  deliveryMethod: "PICKUP" | "DELIVERY";
  address: string;
  addressDetails: string;
  city: string;
  postalCode: string;
  notes: string;
  pickupDate: string;
  pickupTimeSlot: string;
  pickupNotes: string;
}