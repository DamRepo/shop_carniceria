import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CheckoutFormData } from "@/components/checkout/types";

export interface CheckoutTotals {
  subtotal: number;
  subtotalNet: number;
  deliveryCost: number;
  total: number;
}

interface CheckoutState {
  formData: CheckoutFormData | null;
  totals: CheckoutTotals | null;
  setFormData: (data: CheckoutFormData) => void;
  setTotals: (totals: CheckoutTotals) => void;
  clear: () => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      formData: null,
      totals: null,
      setFormData: (formData) => set({ formData }),
      setTotals: (totals) => set({ totals }),
      clear: () => set({ formData: null, totals: null }),
    }),
    {
      name: "checkout-store",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
