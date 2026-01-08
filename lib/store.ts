import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  slug: string;
  price: number; // en centavos
  quantity: number;
  unitType: 'PER_KG' | 'PER_UNIT';
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

export const useCartStore = create<CartStore>()(persist(
  (set, get) => ({
    items: [],
    addItem: (newItem) => {
      const items = get().items;
      const existingItem = items.find((item) => item?.id === newItem?.id);

      if (existingItem) {
        set({
          items: items?.map?.((item) =>
            item?.id === newItem?.id
              ? { ...item, quantity: (item?.quantity ?? 0) + (newItem?.quantity ?? 0) }
              : item
          ) ?? [],
        });
      } else {
        set({ items: [...(items ?? []), newItem] });
      }
    },
    removeItem: (id) => {
      set({ items: get()?.items?.filter?.((item) => item?.id !== id) ?? [] });
    },
    updateQuantity: (id, quantity) => {
      if ((quantity ?? 0) <= 0) {
        get().removeItem(id);
        return;
      }
      set({
        items: get()?.items?.map?.((item) =>
          item?.id === id ? { ...item, quantity } : item
        ) ?? [],
      });
    },
    clearCart: () => set({ items: [] }),
    getTotalItems: () => {
      return get()?.items?.reduce?.((sum, item) => (sum ?? 0) + (item?.quantity ?? 0), 0) ?? 0;
    },
    getTotalPrice: () => {
      return get()?.items?.reduce?.(
        (sum, item) => (sum ?? 0) + ((item?.price ?? 0) * (item?.quantity ?? 0)),
        0
      ) ?? 0;
    },
  }),
  {
    name: 'cart-storage',
  }
));
