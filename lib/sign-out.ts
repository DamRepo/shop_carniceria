"use client";

import { signOut } from "next-auth/react";
import { useCheckoutStore } from "@/lib/checkout-store";

// Cierra sesión limpiando antes los datos de contacto del checkout
// (sessionStorage "checkout-store"). El carrito no se toca.
export function signOutAndClearCheckout(options?: Parameters<typeof signOut>[0]) {
  useCheckoutStore.getState().clear();
  return signOut(options);
}
