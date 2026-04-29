"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/store";
import { useCheckoutStore } from "@/lib/checkout-store";

export function ClearCartOnMount() {
  const clearCart = useCartStore((s) => s.clearCart);
  const clearCheckout = useCheckoutStore((s) => s.clear);

  useEffect(() => {
    clearCart?.();
    clearCheckout?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Ejecutar solo al montar — referencia estable de Zustand

  return null;
}
