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
  /** Id del usuario dueño de formData; null = invitado. */
  ownerId: string | null;
  totals: CheckoutTotals | null;
  setFormData: (data: CheckoutFormData, ownerId: string | null) => void;
  setTotals: (totals: CheckoutTotals) => void;
  clear: () => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      formData: null,
      ownerId: null,
      totals: null,
      setFormData: (formData, ownerId) => set({ formData, ownerId }),
      setTotals: (totals) => set({ totals }),
      clear: () => set({ formData: null, ownerId: null, totals: null }),
    }),
    {
      name: "checkout-store",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
