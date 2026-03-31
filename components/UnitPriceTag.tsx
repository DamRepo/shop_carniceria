import { computeUnitPrice } from "@/lib/unitPrice";

interface UnitPriceTagProps {
  priceCents: number;
  measurementUnit: string;
  unitMultiplier: number;
}

export function UnitPriceTag({
  priceCents,
  measurementUnit,
  unitMultiplier,
}: UnitPriceTagProps) {
  const result = computeUnitPrice(priceCents, measurementUnit, unitMultiplier);
  if (!result) return null;

  return (
    <span className="text-xs text-muted-foreground">{result.label}</span>
  );
}
