export type UnitType = "PER_KG" | "PER_UNIT";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;

  unitType: UnitType;

  price: number; // centavos
  stock: number; // si PER_KG: kg (puede ser decimal). Si UNIT: unidades enteras (idealmente)

  netWeightGr?: number | null; // gramos netos del envase (solo PER_UNIT)
  netVolumeMl?: number | null; // ml netos del envase (solo PER_UNIT)

  measurementUnit?: string | null;
  unitMultiplier?: number | null;
  brand?: string | null;

  isActive: boolean;
  isFeatured: boolean;

  categoryId: string;
  category?: Category;

  isOnSale: boolean;
  salePrice: number | null; // centavos
  saleEndDate: Date | null;
  discountPercent: number | null;

  createdAt: Date;
  updatedAt: Date;
};
