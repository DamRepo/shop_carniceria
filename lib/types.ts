// Product types
export type UnitType = 'PER_KG' | 'PER_UNIT';

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
  price: number; // precio en centavos
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  categoryId: string;
  category?: Category;
  // Campos de oferta
  isOnSale: boolean;
  salePrice: number | null;
  saleEndDate: Date | null;
  discountPercent: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};