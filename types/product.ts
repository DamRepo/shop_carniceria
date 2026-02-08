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
