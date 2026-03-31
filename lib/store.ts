import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeKgQuantity } from "@/lib/utils-format";

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

  // Reglas opcionales de compra
  minPurchaseQty?: number | null;
  qtyStep?: number | null;
  maxPurchaseQty?: number | null;
  allowsDecimals?: boolean;
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

/* =========================
   Helpers
========================= */

export const safeUnitType = (unitType: unknown): "PER_KG" | "PER_UNIT" => {
  return unitType === "PER_KG" || unitType === "PER_UNIT"
    ? unitType
    : "PER_UNIT";
};

export const normalizeUnitQty = (q: unknown) => {
  const n = Math.floor(Number(q));
  return Number.isFinite(n) && n >= 1 ? n : 1;
};

export const normalizeKgQty = (q: unknown, allowsDecimals = true) => {
  const n = Number(q);
  if (!Number.isFinite(n)) return allowsDecimals ? 0.1 : 1;

  if (!allowsDecimals) {
    const rounded = Math.round(n);
    return rounded >= 1 ? rounded : 1;
  }

  const clamped = Math.max(0.1, n);
  return +clamped.toFixed(3);
};

export const safePositiveNumberOrNull = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const getDynamicKgStep = (quantity: number) => {
  return quantity < 1 ? 0.1 : 0.5;
};

export const getItemRules = (item: Partial<CartItem>) => {
  const unitType = safeUnitType(item.unitType);

  const allowsDecimals =
    unitType === "PER_KG" ? Boolean(item.allowsDecimals ?? true) : false;

  const minPurchaseQty =
    safePositiveNumberOrNull(item.minPurchaseQty) ??
    (unitType === "PER_KG" ? (allowsDecimals ? 0.1 : 1) : 1);

  const rawStep = safePositiveNumberOrNull(item.qtyStep);
  const maxPurchaseQty = safePositiveNumberOrNull(item.maxPurchaseQty);

  // Solo respetamos qtyStep fijo si parece una regla/promoción real.
  // Ejemplos:
  // - PER_UNIT
  // - PER_KG sin decimales
  // - promo por 2kg, 3kg, etc.
  const hasCustomFixedStep =
    rawStep != null &&
    (unitType === "PER_UNIT" ||
      !allowsDecimals ||
      (minPurchaseQty >= 2 && rawStep >= 1));

  const qtyStep = hasCustomFixedStep
    ? rawStep!
    : unitType === "PER_KG"
      ? allowsDecimals
        ? getDynamicKgStep(Number(item.quantity) || minPurchaseQty)
        : 1
      : 1;

  return {
    unitType,
    allowsDecimals,
    minPurchaseQty,
    qtyStep,
    maxPurchaseQty,
    hasCustomFixedStep,
  };
};

export const normalizeQtyWithRules = (item: Partial<CartItem>, q: unknown) => {
  const {
    unitType,
    allowsDecimals,
    minPurchaseQty,
    qtyStep,
    maxPurchaseQty,
    hasCustomFixedStep,
  } = getItemRules(item);

  let n = Number(q);
  if (!Number.isFinite(n)) n = minPurchaseQty;

  if (unitType === "PER_UNIT") {
    n = Math.floor(n);
    if (n < minPurchaseQty) n = minPurchaseQty;

    const stepsFromMin = Math.round((n - minPurchaseQty) / qtyStep);
    let stepped = minPurchaseQty + stepsFromMin * qtyStep;

    if (stepped < minPurchaseQty) stepped = minPurchaseQty;

    if (maxPurchaseQty != null && stepped > maxPurchaseQty) {
      const maxSteps = Math.floor((maxPurchaseQty - minPurchaseQty) / qtyStep);
      const maxAllowed = minPurchaseQty + Math.max(0, maxSteps) * qtyStep;
      stepped = maxAllowed >= minPurchaseQty ? maxAllowed : minPurchaseQty;
    }

    return normalizeUnitQty(stepped);
  }

  if (!allowsDecimals) {
    n = Math.round(n);
    if (n < minPurchaseQty) n = minPurchaseQty;

    const stepsFromMin = Math.round((n - minPurchaseQty) / qtyStep);
    let stepped = minPurchaseQty + stepsFromMin * qtyStep;

    if (stepped < minPurchaseQty) stepped = minPurchaseQty;

    if (maxPurchaseQty != null && stepped > maxPurchaseQty) {
      const maxSteps = Math.floor((maxPurchaseQty - minPurchaseQty) / qtyStep);
      const maxAllowed = minPurchaseQty + Math.max(0, maxSteps) * qtyStep;
      stepped = maxAllowed >= minPurchaseQty ? maxAllowed : minPurchaseQty;
    }

    return normalizeKgQty(stepped, false);
  }

  // PER_KG normal con decimales: usar lógica dinámica real
  if (!hasCustomFixedStep) {
    let normalized = normalizeKgQuantity(n);

    if (normalized < minPurchaseQty) {
      normalized = minPurchaseQty;
    }

    if (maxPurchaseQty != null && normalized > maxPurchaseQty) {
      normalized = normalizeKgQuantity(maxPurchaseQty);
    }

    return normalized;
  }

  // PER_KG con regla fija real (promo/packs)
  n = +n.toFixed(3);
  if (n < minPurchaseQty) n = minPurchaseQty;

  const stepsFromMin = Math.round((n - minPurchaseQty) / qtyStep);
  let stepped = minPurchaseQty + stepsFromMin * qtyStep;

  if (stepped < minPurchaseQty) stepped = minPurchaseQty;

  if (maxPurchaseQty != null && stepped > maxPurchaseQty) {
    const maxSteps = Math.floor((maxPurchaseQty - minPurchaseQty) / qtyStep);
    const maxAllowed = minPurchaseQty + Math.max(0, maxSteps) * qtyStep;
    stepped = maxAllowed >= minPurchaseQty ? maxAllowed : minPurchaseQty;
  }

  return normalizeKgQty(stepped, true);
};

export const incrementByRules = (item: Partial<CartItem>) => {
  const { unitType, allowsDecimals, qtyStep, hasCustomFixedStep } = getItemRules(item);

  if (unitType === "PER_KG" && allowsDecimals && !hasCustomFixedStep) {
    const current = normalizeKgQuantity(Number(item.quantity) || 0.1);
    const dynamicStep = getDynamicKgStep(current);
    return normalizeQtyWithRules(item, current + dynamicStep);
  }

  return normalizeQtyWithRules(item, (Number(item.quantity) || 0) + qtyStep);
};

export const decrementByRules = (item: Partial<CartItem>) => {
  const { unitType, allowsDecimals, qtyStep, hasCustomFixedStep } = getItemRules(item);

  if (unitType === "PER_KG" && allowsDecimals && !hasCustomFixedStep) {
    const current = normalizeKgQuantity(Number(item.quantity) || 0.1);
    const dynamicStep = current <= 1 ? 0.1 : 0.5;
    return normalizeQtyWithRules(item, current - dynamicStep);
  }

  return normalizeQtyWithRules(item, (Number(item.quantity) || 0) - qtyStep);
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) => {
        const items = get().items;
        const existingItem = items.find((item) => item.id === newItem.id);

        const normalizedIncoming: CartItem = {
          ...newItem,
          unitType: safeUnitType(newItem.unitType),
          vatRate: newItem.vatRate ?? 0.21,
          minPurchaseQty: safePositiveNumberOrNull(newItem.minPurchaseQty),

          // Para PER_KG normal NO persistimos qtyStep=0.1,
          // solo guardamos qtyStep si es regla fija real.
          qtyStep:
            safeUnitType(newItem.unitType) === "PER_KG"
              ? (() => {
                  const min = safePositiveNumberOrNull(newItem.minPurchaseQty);
                  const step = safePositiveNumberOrNull(newItem.qtyStep);
                  const allowsDecimals = Boolean(newItem.allowsDecimals ?? true);

                  if (!allowsDecimals) return step ?? 1;
                  if (step != null && min != null && min >= 2 && step >= 1) {
                    return step;
                  }

                  return null;
                })()
              : safePositiveNumberOrNull(newItem.qtyStep),

          maxPurchaseQty: safePositiveNumberOrNull(newItem.maxPurchaseQty),
          allowsDecimals:
            safeUnitType(newItem.unitType) === "PER_KG"
              ? Boolean(newItem.allowsDecimals ?? true)
              : false,
          quantity: normalizeQtyWithRules(newItem, newItem.quantity),
        };

        if (existingItem) {
          const mergedBase: CartItem = {
            ...existingItem,
            name: normalizedIncoming.name ?? existingItem.name,
            slug: normalizedIncoming.slug ?? existingItem.slug,
            image: normalizedIncoming.image ?? existingItem.image,
            price: normalizedIncoming.price ?? existingItem.price,
            vatRate: normalizedIncoming.vatRate ?? existingItem.vatRate ?? 0.21,
            unitType: normalizedIncoming.unitType ?? existingItem.unitType,

            minPurchaseQty:
              normalizedIncoming.minPurchaseQty ??
              existingItem.minPurchaseQty ??
              null,

            qtyStep:
              normalizedIncoming.qtyStep ?? existingItem.qtyStep ?? null,

            maxPurchaseQty:
              normalizedIncoming.maxPurchaseQty ??
              existingItem.maxPurchaseQty ??
              null,

            allowsDecimals:
              normalizedIncoming.allowsDecimals ??
              existingItem.allowsDecimals ??
              true,

            quantity: existingItem.quantity,
          };

          const nextQty = normalizeQtyWithRules(
            mergedBase,
            (existingItem.quantity ?? 0) + normalizedIncoming.quantity
          );

          set({
            items: items.map((item) =>
              item.id === newItem.id
                ? {
                    ...mergedBase,
                    quantity: nextQty,
                  }
                : item
            ),
          });

          return;
        }

        set({
          items: [...items, normalizedIncoming],
        });
      },

      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) });
      },

      updateQuantity: (id, quantity) => {
        const item = get().items.find((i) => i.id === id);
        if (!item) return;

        const nextQty = normalizeQtyWithRules(item, quantity);

        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, quantity: nextQty } : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      getTotalItems: () => get().items.length,

      getTotalPrice: () => {
        const total = get().items.reduce((sum, item) => {
          const q = normalizeQtyWithRules(item, item.quantity);
          return sum + (item.price ?? 0) * q;
        }, 0);

        return Math.round(total);
      },
    }),
    {
      name: "cart-storage",

      onRehydrateStorage: () => (state) => {
        if (!state) return;

        state.items = (state.items ?? []).map((it) => {
          const unitType = safeUnitType(it.unitType);
          const min = safePositiveNumberOrNull(it.minPurchaseQty);
          const rawStep = safePositiveNumberOrNull(it.qtyStep);
          const allowsDecimals =
            unitType === "PER_KG" ? Boolean(it.allowsDecimals ?? true) : false;

          const normalizedQtyStep =
            unitType === "PER_KG"
              ? !allowsDecimals
                ? rawStep ?? 1
                : rawStep != null && min != null && min >= 2 && rawStep >= 1
                  ? rawStep
                  : null
              : rawStep;

          const normalized: CartItem = {
            ...it,
            unitType,
            vatRate: it.vatRate ?? 0.21,
            minPurchaseQty: min,
            qtyStep: normalizedQtyStep,
            maxPurchaseQty: safePositiveNumberOrNull(it.maxPurchaseQty),
            allowsDecimals,
            quantity: normalizeQtyWithRules(
              {
                ...it,
                unitType,
                qtyStep: normalizedQtyStep,
                allowsDecimals,
              },
              it.quantity
            ),
          };

          return normalized;
        });
      },
    }
  )
);