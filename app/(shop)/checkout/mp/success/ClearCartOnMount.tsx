"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/store";

export function ClearCartOnMount() {
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    clearCart?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Ejecutar solo al montar — clearCart de Zustand tiene referencia estable

  return null;
}
