// Zonas y costos de envío (en centavos)
export const SHIPPING_ZONES = {
  CITY: {
    label: "Ciudad (San José de Feliciano)",
    price: 150000, // $1.500
    priceDisplay: "$1.500",
  },
  EJIDO: {
    label: "Ejido (hasta 4km)",
    price: 320000, // $3.200
    priceDisplay: "$3.200",
  },
} as const;

export type ShippingZone = keyof typeof SHIPPING_ZONES;

export const SHIPPING_OUTSIDE_MESSAGE =
  "Solo realizamos envíos en San José de Feliciano y zona de ejido";

export function getShippingCost(zone: ShippingZone): number {
  return SHIPPING_ZONES[zone].price;
}

export function isValidShippingZone(value: unknown): value is ShippingZone {
  return value === "CITY" || value === "EJIDO";
}
