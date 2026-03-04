// lib/store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  name: string;
  slug: string;
  price: number; // centavos (precio final bruto)
  quantity: number; // PER_UNIT entero, PER_KG decimal
  unitType: "PER_KG" | "PER_UNIT";
  image?: string;

  // IVA efectivo del ítem (0.21 o 0.105)
  vatRate?: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;

  // UX: badge del header
  getTotalItems: () => number;

  // total bruto en centavos
  getTotalPrice: () => number;
}

/* =========================
   Normalizadores de cantidad
========================= */

const normalizeUnitQty = (q: unknown) => {
  const n = Math.floor(Number(q));
  return Number.isFinite(n) && n >= 1 ? n : 1;
};

const normalizeKgQty = (q: unknown) => {
  const n = Number(q);
  if (!Number.isFinite(n)) return 1;

  // mínimo 0.1kg (100g)
  const clamped = Math.max(0.1, n);

  // evita basura flotante (1.5000000002)
  return +clamped.toFixed(3);
};

const normalizeQtyByType = (unitType: "PER_KG" | "PER_UNIT", q: unknown) => {
  return unitType === "PER_KG" ? normalizeKgQty(q) : normalizeUnitQty(q);
};

const safeUnitType = (unitType: unknown): "PER_KG" | "PER_UNIT" => {
  return unitType === "PER_KG" || unitType === "PER_UNIT" ? unitType : "PER_UNIT";
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) => {
        const items = get().items;
        const existingItem = items.find((item) => item.id === newItem.id);

        const unitType = safeUnitType(newItem.unitType);
        const incomingQty = normalizeQtyByType(unitType, newItem.quantity);

        if (existingItem) {
          const existingType = safeUnitType(existingItem.unitType);

          const nextQty = normalizeQtyByType(
            existingType,
            (existingItem.quantity ?? 0) + incomingQty
          );

          set({
            items: items.map((item) =>
              item.id === newItem.id
                ? {
                    ...item,

                    // si el item del storage quedó viejo, refrescamos info base
                    name: newItem.name ?? item.name,
                    slug: newItem.slug ?? item.slug,
                    unitType: unitType ?? item.unitType,

                    // sumamos qty (ya normalizada)
                    quantity: nextQty,

                    // si viene vatRate nuevo y antes no había, guardarlo
                    vatRate: item.vatRate ?? newItem.vatRate ?? 0.21,

                    // si antes no había imagen y ahora sí, guardarla
                    image: item.image ?? newItem.image,

                    // si cambia el precio (oferta) tomamos el último
                    price: newItem.price ?? item.price,
                  }
                : item
            ),
          });
        } else {
          set({
            items: [
              ...items,
              {
                ...newItem,
                unitType,
                quantity: incomingQty,
                vatRate: newItem.vatRate ?? 0.21,
              },
            ],
          });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) });
      },

      updateQuantity: (id, quantity) => {
        const item = get().items.find((i) => i.id === id);
        if (!item) return;

        const unitType = safeUnitType(item.unitType);
        const q = normalizeQtyByType(unitType, quantity);

        set({
          items: get().items.map((i) => (i.id === id ? { ...i, quantity: q } : i)),
        });
      },

      clearCart: () => set({ items: [] }),

      // UX: cantidad de líneas (items distintos), no suma de kg/unidades
      getTotalItems: () => get().items.length,

      getTotalPrice: () => {
        const total = get().items.reduce((sum, item) => {
          const unitType = safeUnitType(item.unitType);
          const q = normalizeQtyByType(unitType, item.quantity);
          return sum + (item.price ?? 0) * q;
        }, 0);

        // total en centavos entero (evita 199.9999998)
        return Math.round(total);
      },
    }),
    {
      name: "cart-storage",

      // sanea carritos viejos al rehidratar
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        state.items = (state.items ?? []).map((it) => {
          const unitType = safeUnitType(it.unitType);

          return {
            ...it,
            unitType,
            quantity: normalizeQtyByType(unitType, it.quantity),
            vatRate: it.vatRate ?? 0.21,
          };
        });
      },
    }
  )
);