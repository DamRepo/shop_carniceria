import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  name: string;
  slug: string;
  price: number; // en centavos
  quantity: number;
  unitType: "PER_KG" | "PER_UNIT";
  image?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) => {
        const items = get().items;
        const existingItem = items.find((item) => item.id === newItem.id);

        if (existingItem) {
          // Si ya existe, sumamos cantidad
          let nextQty = (existingItem.quantity ?? 0) + (newItem.quantity ?? 0);

          // Si es por unidad, forzamos entero
          if (existingItem.unitType === "PER_UNIT") {
            nextQty = Math.round(nextQty);
          }

          set({
            items: items.map((item) =>
              item.id === newItem.id ? { ...item, quantity: nextQty } : item
            ),
          });
        } else {
          // Item nuevo
          let q = newItem.quantity ?? 1;

          if (newItem.unitType === "PER_UNIT") {
            q = Math.round(q);
          }

          set({ items: [...items, { ...newItem, quantity: q }] });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) });
      },

      updateQuantity: (id, quantity) => {
        const item = get().items.find((i) => i.id === id);
        if (!item) return;

        let q = quantity;

        // Si es por unidad, obligamos enteros
        if (item.unitType === "PER_UNIT") {
          q = Math.round(q);
        }

        if (q <= 0) {
          get().removeItem(id);
          return;
        }

        set({
          items: get().items.map((i) => (i.id === id ? { ...i, quantity: q } : i)),
        });
      },

      clearCart: () => set({ items: [] }),

      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 0),
          0
        );
      },
    }),
    { name: "cart-storage" }
  )
);
