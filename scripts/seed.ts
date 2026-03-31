import { PrismaClient } from "@prisma/client";

type UnitType = "PER_KG" | "PER_UNIT";
type UserRole = "CUSTOMER" | "ADMIN" | "EMPLOYEE";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const VAT_GENERAL = 0.21;
const VAT_CARNICERIA = 0.105;

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
  vatRate?: number; // ✅ nuevo
}) {
  const slug = slugify(params.name);

  let parentId: string | null = null;

  if (params.parentSlug) {
    const parent = await prisma.category.findUnique({
      where: { slug: params.parentSlug },
      select: { id: true, vatRate: true, slug: true },
    });

    if (!parent) {
      throw new Error(`No existe la categoría padre "${params.parentSlug}"`);
    }

    parentId = parent.id;

    // ✅ si no viene vatRate, heredar del padre
    if (params.vatRate === undefined) {
      params.vatRate = parent.vatRate ?? VAT_GENERAL;
    }
  }

  // ✅ default si no hay padre y no vino vatRate
  const vatRate = params.vatRate ?? VAT_GENERAL;

  return prisma.category.upsert({
    where: { slug },
    update: {
      name: params.name,
      description: params.description ?? null,
      parentId,
      vatRate, // ✅ nuevo
    },
    create: {
      name: params.name,
      slug,
      description: params.description ?? null,
      parentId,
      vatRate, // ✅ nuevo
    },
  });
}

type SeedProduct = {
  name: string;
  slug: string;
  description?: string | null;
  unitType: UnitType;
  price: number;
  stock: number;
  categorySlug: string;
  isFeatured?: boolean;
  isOnSale?: boolean;
  salePrice?: number | null;
  saleEndDate?: Date | null;
  discountPercent?: number | null;

  // ✅ opcional: si algún producto necesita IVA especial
  vatRate?: number | null;
};

async function upsertProduct(p: SeedProduct) {
  const category = await prisma.category.findUnique({
    where: { slug: p.categorySlug },
    select: { id: true },
  });

  if (!category) {
    throw new Error(`No existe categoría "${p.categorySlug}"`);
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
      image: null,
      isActive: true,

      // ✅ nuevo (solo si lo usás)
      vatRate: p.vatRate ?? null,
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
      image: null,
      isActive: true,

      // ✅ nuevo
      vatRate: p.vatRate ?? null,
    },
  });
}

async function devReset() {
  if (process.env.NODE_ENV !== "development") return;

  await prisma.checkoutSession.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();

  await prisma.category.deleteMany({ where: { parentId: { not: null } } });
  await prisma.category.deleteMany({ where: { parentId: null } });
}

async function main() {
  console.log("🌱 Iniciando seed...");

  await devReset();
  console.log("✅ Limpieza dev OK");

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
      role: "ADMIN",
      receiveOffers: false,
      name: "Administrador",
    },
    create: {
      name: "Administrador",
      email: adminEmail,
      password: hashedPassword,
      role: "ADMIN",
      receiveOffers: false,
    },
  });

  console.log("✅ Admin listo");

  const CATEGORY_TREE: Array<{ parent: string; children: string[] }> = [
    {
      parent: "MINIMERCADO",
      children: [
        "Aceites, vinagres y aderezos",
        "Arroz, fideos y legumbres",
        "Caldos, sopas y pure",
        "Condimentos y especias",
        "Conservas y enlatados",
        "Desayunos y meriendas",
        "Harinas",
        "kiosco",
        "Panificación",
        "Repostería",
        "Bebidas",
        "Perfumería, bebes y niños",
        "Indumentarias, calzados y accesorios",
        "Bazar",
      ],
    },
    {
      parent: "CARNICERIA",
      children: ["Carne Vacuna", "Carne de Cerdo", "Carne de cordero", "Pollo", "Achuras"],
    },
    {
      parent: "ELABORADOS",
      children: ["Elaboración propia", "Embutidos", "Congelados"],
    },
    {
      parent: "FRUTERIA Y VERDULERIA",
      children: [
        "Frutas frescas",
        "Frutas congeladas",
        "Frutas secas, disecadas",
        "Verduras frescas",
        "Verduras congeladas",
      ],
    },
  ];

  for (const node of CATEGORY_TREE) {
    // ✅ si el padre es CARNICERIA => 10,5%, sino 21%
    const parentVat = slugify(node.parent) === slugify("CARNICERIA") ? VAT_CARNICERIA : VAT_GENERAL;

    const parent = await upsertCategory({ name: node.parent, vatRate: parentVat });

    for (const child of node.children) {
      // ✅ heredan automáticamente el vatRate del padre (por la función upsertCategory)
      await upsertCategory({
        name: child,
        parentSlug: parent.slug,
      });
    }
  }

  console.log("✅ Categorías creadas (con IVA)");

  const productos: SeedProduct[] = [
    {
      name: "Agua Mineral 2L",
      slug: "agua-mineral-2l",
      description: "Agua mineral sin gas",
      unitType: "PER_UNIT",
      price: 75000,
      stock: 200,
      categorySlug: slugify("Bebidas"),
      isFeatured: true,
    },
    {
      name: "Asado (por kg)",
      slug: "asado-kg",
      description: "Tira de asado para parrilla",
      unitType: "PER_KG",
      price: 850000,
      stock: 50,
      categorySlug: slugify("Carne Vacuna"),
      isFeatured: true,
    },
    {
      name: "Pollo Entero (por kg)",
      slug: "pollo-entero-kg",
      description: "Pollo entero fresco",
      unitType: "PER_KG",
      price: 420000,
      stock: 40,
      categorySlug: slugify("Pollo"),
    },
    {
      name: "Chorizo Parrillero (por kg)",
      slug: "chorizo-parrillero-kg",
      description: "Chorizo parrillero casero",
      unitType: "PER_KG",
      price: 680000,
      stock: 60,
      categorySlug: slugify("Embutidos"),
    },
    {
      name: "Papa (por kg)",
      slug: "papa-kg",
      description: "Papa blanca",
      unitType: "PER_KG",
      price: 120000,
      stock: 100,
      categorySlug: slugify("Verduras frescas"),
    },
  ];

  for (const p of productos) {
    await upsertProduct(p);
  }

  const offerEndDate = new Date();
  offerEndDate.setDate(offerEndDate.getDate() + 7);

  await upsertProduct({
    name: "Agua Mineral 2L (Oferta)",
    slug: "agua-mineral-2l-oferta",
    description: "Oferta por tiempo limitado",
    unitType: "PER_UNIT",
    price: 75000,
    stock: 100,
    categorySlug: slugify("Bebidas"),
    isOnSale: true,
    salePrice: 65000,
    saleEndDate: offerEndDate,
    discountPercent: 13,
  });

  console.log("🎉 Seed listo.");
}

main()
  .catch((e) => {
    console.error("❌ Error seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });