import { PrismaClient, UnitType, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function upsertCategory(params: {
  name: string;
  description?: string | null;
  parentSlug?: string | null;
}) {
  const slug = slugify(params.name);

  let parentId: string | null = null;
  if (params.parentSlug) {
    const parent = await prisma.category.findUnique({
      where: { slug: params.parentSlug },
      select: { id: true },
    });
    if (!parent) {
      throw new Error(`No existe la categoría padre con slug "${params.parentSlug}"`);
    }
    parentId = parent.id;
  }

  return prisma.category.upsert({
    where: { slug },
    update: {
      name: params.name,
      description: params.description ?? null,
      parentId, // ⬅️ asumo tu campo se llama parentId
    },
    create: {
      name: params.name,
      slug,
      description: params.description ?? null,
      parentId,
    },
  });
}

type SeedProduct = {
  name: string;
  slug: string;
  description?: string | null;
  unitType: UnitType;
  price: number; // en centavos (como ya usás)
  stock: number;
  categorySlug: string; // ⬅️ ahora asignamos por slug (subcategoría)
  isFeatured?: boolean;
  isOnSale?: boolean;
  salePrice?: number | null; // centavos
  saleEndDate?: Date | null;
  discountPercent?: number | null;
  image?: string | null;
};

async function upsertProduct(p: SeedProduct) {
  const category = await prisma.category.findUnique({
    where: { slug: p.categorySlug },
    select: { id: true },
  });

  if (!category) {
    throw new Error(`No existe la categoría (slug) "${p.categorySlug}" para el producto "${p.slug}"`);
  }

  await prisma.product.upsert({
    where: { slug: p.slug },
    update: {
      name: p.name,
      description: p.description ?? null,
      unitType: p.unitType,
      price: p.price,
      stock: p.stock,
      categoryId: category.id,
      isFeatured: p.isFeatured ?? false,
      isOnSale: p.isOnSale ?? false,
      salePrice: p.salePrice ?? null,
      saleEndDate: p.saleEndDate ?? null,
      discountPercent: p.discountPercent ?? null,
      image: p.image ?? null,
      isActive: true,
    },
    create: {
      name: p.name,
      slug: p.slug,
      description: p.description ?? null,
      unitType: p.unitType,
      price: p.price,
      stock: p.stock,
      categoryId: category.id,
      isFeatured: p.isFeatured ?? false,
      isOnSale: p.isOnSale ?? false,
      salePrice: p.salePrice ?? null,
      saleEndDate: p.saleEndDate ?? null,
      discountPercent: p.discountPercent ?? null,
      image: p.image ?? null,
      isActive: true,
    },
  });
}

async function devReset() {
  if (process.env.NODE_ENV === "production") return;

  // Borra primero dependencias
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();

  // Para árbol: primero hijos, luego padres
  await prisma.category.deleteMany({ where: { parentId: { not: null } } });
  await prisma.category.deleteMany({ where: { parentId: null } });
}

async function main() {
  console.log("🌱 Iniciando seed...");

  await devReset();
  console.log("✅ Limpieza dev OK");

  // Admin
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error("Faltan ADMIN_EMAIL o ADMIN_PASSWORD en .env");
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      role: UserRole.ADMIN,
      receiveOffers: false,
      name: "Administrador",
    },
    create: {
      name: "Administrador",
      email: adminEmail,
      password: hashedPassword,
      role: UserRole.ADMIN,
      receiveOffers: false,
    },
  });

  console.log("✅ Admin listo:", adminEmail);

  // =========================
  // 1) Categorías PADRE
  // =========================
  const carniceria = await upsertCategory({
    name: "Carnicería",
    description: "Cortes y carnes frescas",
    parentSlug: null,
  });

  const minimercado = await upsertCategory({
    name: "Minimercado",
    description: "Almacén y productos varios",
    parentSlug: null,
  });

  const embutidosParent = await upsertCategory({
    name: "Embutidos",
    description: "Embutidos y elaboración propia",
    parentSlug: null,
  });

  // =========================
  // 2) Subcategorías
  // =========================
  // Carnicería
  await upsertCategory({
    name: "Carnes Rojas",
    description: "Cortes premium de carne vacuna",
    parentSlug: carniceria.slug,
  });

  await upsertCategory({
    name: "Pollo",
    description: "Pollo fresco y congelado",
    parentSlug: carniceria.slug,
  });

  // Embutidos
  await upsertCategory({
    name: "Embutidos Caseros",
    description: "Chorizos, morcillas, salchichas, etc.",
    parentSlug: embutidosParent.slug,
  });

  // Minimercado (tus actuales)
  await upsertCategory({
    name: "Despensa",
    description: "Productos de almacén y despensa",
    parentSlug: minimercado.slug,
  });
  await upsertCategory({
    name: "Bebidas",
    description: "Bebidas y refrescos",
    parentSlug: minimercado.slug,
  });
  await upsertCategory({
    name: "Lácteos",
    description: "Productos lácteos frescos",
    parentSlug: minimercado.slug,
  });
  await upsertCategory({
    name: "Congelados",
    description: "Productos congelados listos para cocinar",
    parentSlug: minimercado.slug,
  });

  // Minimercado (subcategorías “Meli” de tu imagen)
  const minimercadoExtra = [
    "Aceites, vinagres y aderezos",
    "Arroz, legumbres y pastas",
    "Caldo, sopa y puré",
    "Condimentos y especias",
    "Conservas y enlatados",
    "Desayunos y meriendas",
    "Harinas",
    "Kiosco",
    "Panificación",
    "Repostería",
  ];

  for (const name of minimercadoExtra) {
    await upsertCategory({ name, parentSlug: minimercado.slug });
  }

  console.log("✅ Categorías (árbol) creadas");

  // =========================
  // 3) Productos (asignar a SUBCATEGORÍA)
  // =========================

  const productos: SeedProduct[] = [
    // Carnes Rojas (subcat)
    {
      name: "Asado",
      slug: "asado",
      description: "Tira de asado de primera calidad, ideal para la parrilla",
      unitType: UnitType.PER_KG,
      price: 850000,
      stock: 50,
      categorySlug: slugify("Carnes Rojas"),
      isFeatured: true,
    },
    {
      name: "Vacío",
      slug: "vacio",
      description: "Vacío tierno y jugoso, perfecto para asar",
      unitType: UnitType.PER_KG,
      price: 920000,
      stock: 30,
      categorySlug: slugify("Carnes Rojas"),
      isFeatured: true,
    },

    // Pollo (subcat)
    {
      name: "Pollo Entero",
      slug: "pollo-entero",
      description: "Pollo entero fresco, ideal para horno",
      unitType: UnitType.PER_KG,
      price: 420000,
      stock: 40,
      categorySlug: slugify("Pollo"),
      isFeatured: true,
    },

    // Embutidos Caseros (subcat)
    {
      name: "Chorizo Parrillero",
      slug: "chorizo-parrillero",
      description: "Chorizo casero parrillero, elaboración propia",
      unitType: UnitType.PER_KG,
      price: 680000,
      stock: 60,
      categorySlug: slugify("Embutidos Caseros"),
      isFeatured: true,
    },

    // Minimercado: Despensa (subcat)
    {
      name: "Arroz Largo Fino 1kg",
      slug: "arroz-largo-fino-1kg",
      description: "Arroz largo fino de primera calidad",
      unitType: UnitType.PER_UNIT,
      price: 145000,
      stock: 100,
      categorySlug: slugify("Despensa"),
    },

    // Minimercado: Bebidas (subcat)
    {
      name: "Agua Mineral 2L",
      slug: "agua-mineral-2l",
      description: "Agua mineral sin gas",
      unitType: UnitType.PER_UNIT,
      price: 75000,
      stock: 200,
      categorySlug: slugify("Bebidas"),
    },

    // Minimercado: Lácteos (subcat)
    {
      name: "Leche Entera 1L",
      slug: "leche-entera-1l",
      description: "Leche entera fresca",
      unitType: UnitType.PER_UNIT,
      price: 125000,
      stock: 100,
      categorySlug: slugify("Lácteos"),
    },

    // Minimercado: Congelados (subcat)
    {
      name: "Hamburguesas Caseras x4",
      slug: "hamburguesas-caseras-x4",
      description: "Pack de 4 hamburguesas caseras de 150g c/u",
      unitType: UnitType.PER_UNIT,
      price: 480000,
      stock: 80,
      categorySlug: slugify("Congelados"),
    },
  ];

  // Insertar/upsert productos base
  for (const p of productos) {
    await upsertProduct(p);
  }

  // Ofertas
  const offerEndDate = new Date();
  offerEndDate.setDate(offerEndDate.getDate() + 7);

  const ofertas: SeedProduct[] = [
    {
      name: "Asado en Oferta",
      slug: "asado-oferta",
      description: "Tira de asado en oferta especial - ¡Aprovechá!",
      unitType: UnitType.PER_KG,
      price: 850000,
      stock: 40,
      categorySlug: slugify("Carnes Rojas"),
      isOnSale: true,
      salePrice: 680000,
      saleEndDate: offerEndDate,
      discountPercent: 20,
    },
  ];

  for (const p of ofertas) {
    await upsertProduct(p);
  }

  const totalProducts = await prisma.product.count();
  const totalCategories = await prisma.category.count();

  console.log("🎉 Seed listo.");
  console.log(`📦 Categorías: ${totalCategories}`);
  console.log(`🥩 Productos: ${totalProducts}`);
}

main()
  .catch((e) => {
    console.error("❌ Error seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
