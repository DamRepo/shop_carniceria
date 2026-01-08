import { PrismaClient, UnitType, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Limpiar datos existentes (solo si existen)
  if (process.env.NODE_ENV !== 'production') {
    try {
      await prisma.orderItem.deleteMany();
      await prisma.order.deleteMany();
      await prisma.product.deleteMany();
      await prisma.category.deleteMany();
      console.log('✅ Datos anteriores eliminados');
    } catch (error) {
      console.log('ℹ️ Base de datos limpia (sin datos anteriores)');
    }
  }
  
  // Crear usuario administrador
const bcrypt = require('bcryptjs');

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  throw new Error(' ADMIN_EMAIL o ADMIN_PASSWORD en las variables de entorno');
}


const hashedPassword = await bcrypt.hash(adminPassword, 10);

const adminUser = await prisma.user.upsert({
  where: { email: adminEmail },
  update: {
    password: hashedPassword,
    role: UserRole.ADMIN,
    receiveOffers: false,
    name: 'Administrador',
  },
  create: {
    name: 'Administrador',
    email: adminEmail,
    password: hashedPassword,
    role: UserRole.ADMIN,
    receiveOffers: false,
  },
});

console.log('✅ Usuario administrador listo:');
console.log(`   Email: ${adminEmail}`);
console.log('   Contraseña: (definida por ADMIN_PASSWORD)');

  // Crear categorías
  const carnesRojas = await prisma.category.create({
    data: {
      name: 'Carnes Rojas',
      slug: 'carnes-rojas',
      description: 'Cortes premium de carne vacuna',
    },
  });

  const pollo = await prisma.category.create({
    data: {
      name: 'Pollo',
      slug: 'pollo',
      description: 'Pollo fresco y congelado',
    },
  });

  const embutidos = await prisma.category.create({
    data: {
      name: 'Embutidos',
      slug: 'embutidos',
      description: 'Embutidos caseros de primera calidad',
    },
  });

  const congelados = await prisma.category.create({
    data: {
      name: 'Congelados',
      slug: 'congelados',
      description: 'Productos congelados listos para cocinar',
    },
  });

  const despensa = await prisma.category.create({
    data: {
      name: 'Despensa',
      slug: 'despensa',
      description: 'Productos de almacén y despensa',
    },
  });

  const bebidas = await prisma.category.create({
    data: {
      name: 'Bebidas',
      slug: 'bebidas',
      description: 'Bebidas y refrescos',
    },
  });

  const lacteos = await prisma.category.create({
    data: {
      name: 'Lácteos',
      slug: 'lacteos',
      description: 'Productos lácteos frescos',
    },
  });

  console.log('✅ Categorías creadas');

  // Crear productos de carnes rojas
  const productosCarnesRojas = [
    {
      name: 'Asado',
      slug: 'asado',
      description: 'Tira de asado de primera calidad, ideal para la parrilla',
      unitType: UnitType.PER_KG,
      price: 850000, // $8.500/kg
      stock: 50,
      categoryId: carnesRojas.id,
      isFeatured: true,
    },
    {
      name: 'Vacío',
      slug: 'vacio',
      description: 'Vacío tierno y jugoso, perfecto para asar',
      unitType: UnitType.PER_KG,
      price: 920000, // $9.200/kg
      stock: 30,
      categoryId: carnesRojas.id,
      isFeatured: true,
    },
    {
      name: 'Bife de Chorizo',
      slug: 'bife-de-chorizo',
      description: 'Bife de chorizo angosto, corte premium',
      unitType: UnitType.PER_KG,
      price: 1150000, // $11.500/kg
      stock: 25,
      categoryId: carnesRojas.id,
      isFeatured: true,
    },
    {
      name: 'Entraña',
      slug: 'entrana',
      description: 'Entraña fina para parrilla',
      unitType: UnitType.PER_KG,
      price: 1050000, // $10.500/kg
      stock: 20,
      categoryId: carnesRojas.id,
      isFeatured: true,
    },
    {
      name: 'Matambre',
      slug: 'matambre',
      description: 'Matambre tierno, ideal para arrollar',
      unitType: UnitType.PER_KG,
      price: 780000, // $7.800/kg
      stock: 15,
      categoryId: carnesRojas.id,
    },
    {
      name: 'Cuadril',
      slug: 'cuadril',
      description: 'Cuadril sin tapa, excelente para horno o parrilla',
      unitType: UnitType.PER_KG,
      price: 980000, // $9.800/kg
      stock: 28,
      categoryId: carnesRojas.id,
      isFeatured: true,
    },
    {
      name: 'Osobuco',
      slug: 'osobuco',
      description: 'Osobuco con tuétano, perfecto para guisos',
      unitType: UnitType.PER_KG,
      price: 650000, // $6.500/kg
      stock: 35,
      categoryId: carnesRojas.id,
    },
  ];

  // Crear productos de pollo
  const productosPollo = [
    {
      name: 'Pollo Entero',
      slug: 'pollo-entero',
      description: 'Pollo entero fresco, ideal para horno',
      unitType: UnitType.PER_KG,
      price: 420000, // $4.200/kg
      stock: 40,
      categoryId: pollo.id,
      isFeatured: true,
    },
    {
      name: 'Pechuga',
      slug: 'pechuga',
      description: 'Pechuga de pollo sin hueso ni piel',
      unitType: UnitType.PER_KG,
      price: 580000, // $5.800/kg
      stock: 35,
      categoryId: pollo.id,
      isFeatured: true,
    },
    {
      name: 'Muslos de Pollo',
      slug: 'muslos-pollo',
      description: 'Muslos de pollo frescos',
      unitType: UnitType.PER_KG,
      price: 380000, // $3.800/kg
      stock: 50,
      categoryId: pollo.id,
    },
    {
      name: 'Alitas',
      slug: 'alitas',
      description: 'Alitas de pollo, perfectas para la parrilla',
      unitType: UnitType.PER_KG,
      price: 320000, // $3.200/kg
      stock: 45,
      categoryId: pollo.id,
    },
  ];

  // Crear productos de embutidos
  const productosEmbutidos = [
    {
      name: 'Chorizo Parrillero',
      slug: 'chorizo-parrillero',
      description: 'Chorizo casero parrillero, elaboración propia',
      unitType: UnitType.PER_KG,
      price: 680000, // $6.800/kg
      stock: 60,
      categoryId: embutidos.id,
      isFeatured: true,
    },
    {
      name: 'Morcilla',
      slug: 'morcilla',
      description: 'Morcilla casera de la casa',
      unitType: UnitType.PER_KG,
      price: 550000, // $5.500/kg
      stock: 40,
      categoryId: embutidos.id,
    },
    {
      name: 'Salchicha Parrillera',
      slug: 'salchicha-parrillera',
      description: 'Salchicha tipo parrillera, elaboración artesanal',
      unitType: UnitType.PER_KG,
      price: 620000, // $6.200/kg
      stock: 55,
      categoryId: embutidos.id,
    },
    {
      name: 'Bondiola',
      slug: 'bondiola',
      description: 'Bondiola cocida, ideal para sándwiches',
      unitType: UnitType.PER_KG,
      price: 890000, // $8.900/kg
      stock: 25,
      categoryId: embutidos.id,
      isFeatured: true,
    },
    {
      name: 'Morcipán',
      slug: 'morcipan',
      description: 'Morcilla de pan casera, receta tradicional',
      unitType: UnitType.PER_KG,
      price: 580000, // $5.800/kg
      stock: 30,
      categoryId: embutidos.id,
    },
  ];

  // Crear productos congelados
  const productosCongelados = [
    {
      name: 'Hamburguesas Caseras x4',
      slug: 'hamburguesas-caseras-x4',
      description: 'Pack de 4 hamburguesas caseras de 150g c/u',
      unitType: UnitType.PER_UNIT,
      price: 480000, // $4.800 por pack
      stock: 80,
      categoryId: congelados.id,
    },
    {
      name: 'Milanesas de Nalga x6',
      slug: 'milanesas-nalga-x6',
      description: 'Pack de 6 milanesas de nalga rebozadas',
      unitType: UnitType.PER_UNIT,
      price: 720000, // $7.200 por pack
      stock: 50,
      categoryId: congelados.id,
    },
    {
      name: 'Supremas Rebozadas x4',
      slug: 'supremas-rebozadas-x4',
      description: 'Pack de 4 supremas de pollo rebozadas',
      unitType: UnitType.PER_UNIT,
      price: 580000, // $5.800 por pack
      stock: 60,
      categoryId: congelados.id,
    },
    {
      name: 'Empanadas de Carne x12',
      slug: 'empanadas-carne-x12',
      description: 'Docena de empanadas de carne congeladas',
      unitType: UnitType.PER_UNIT,
      price: 650000, // $6.500 por docena
      stock: 40,
      categoryId: congelados.id,
    },
  ];

  // Productos de Despensa
  const productosDespensa = [
    {
      name: 'Arroz Largo Fino 1kg',
      slug: 'arroz-largo-fino-1kg',
      description: 'Arroz largo fino de primera calidad',
      unitType: UnitType.PER_UNIT,
      price: 145000, // $1.450
      stock: 100,
      categoryId: despensa.id,
    },
    {
      name: 'Fideos Secos 500g',
      slug: 'fideos-secos-500g',
      description: 'Fideos secos variedad de formas',
      unitType: UnitType.PER_UNIT,
      price: 95000, // $950
      stock: 120,
      categoryId: despensa.id,
    },
    {
      name: 'Aceite de Girasol 1.5L',
      slug: 'aceite-girasol-15l',
      description: 'Aceite de girasol puro',
      unitType: UnitType.PER_UNIT,
      price: 285000, // $2.850
      stock: 80,
      categoryId: despensa.id,
    },
  ];

  // Productos de Bebidas
  const productosBebidas = [
    {
      name: 'Agua Mineral 2L',
      slug: 'agua-mineral-2l',
      description: 'Agua mineral sin gas',
      unitType: UnitType.PER_UNIT,
      price: 75000, // $750
      stock: 200,
      categoryId: bebidas.id,
    },
    {
      name: 'Gaseosa Cola 2.25L',
      slug: 'gaseosa-cola-225l',
      description: 'Gaseosa sabor cola',
      unitType: UnitType.PER_UNIT,
      price: 185000, // $1.850
      stock: 150,
      categoryId: bebidas.id,
    },
    {
      name: 'Jugo de Naranja 1L',
      slug: 'jugo-naranja-1l',
      description: 'Jugo de naranja natural',
      unitType: UnitType.PER_UNIT,
      price: 165000, // $1.650
      stock: 80,
      categoryId: bebidas.id,
    },
  ];

  // Productos de Lácteos
  const productosLacteos = [
    {
      name: 'Leche Entera 1L',
      slug: 'leche-entera-1l',
      description: 'Leche entera fresca',
      unitType: UnitType.PER_UNIT,
      price: 125000, // $1.250
      stock: 100,
      categoryId: lacteos.id,
    },
    {
      name: 'Queso Cremoso 200g',
      slug: 'queso-cremoso-200g',
      description: 'Queso cremoso untable',
      unitType: UnitType.PER_UNIT,
      price: 195000, // $1.950
      stock: 60,
      categoryId: lacteos.id,
    },
    {
      name: 'Yogur Natural 500g',
      slug: 'yogur-natural-500g',
      description: 'Yogur natural sin azúcar',
      unitType: UnitType.PER_UNIT,
      price: 145000, // $1.450
      stock: 70,
      categoryId: lacteos.id,
    },
  ];

  // Insertar todos los productos
  const allProducts = [
    ...productosCarnesRojas,
    ...productosPollo,
    ...productosEmbutidos,
    ...productosCongelados,
    ...productosDespensa,
    ...productosBebidas,
    ...productosLacteos,
  ];

  for (const product of allProducts) {
    await prisma.product.create({ data: product });
  }

  console.log('✅ Productos creados');

  // Crear productos con ofertas
  const offerEndDate = new Date();
  offerEndDate.setDate(offerEndDate.getDate() + 7); // Ofertas válidas por 7 días

  const productosEnOferta = [
    {
      name: 'Asado en Oferta',
      slug: 'asado-oferta',
      description: 'Tira de asado en oferta especial - ¡Aprovechá!',
      unitType: UnitType.PER_KG,
      price: 850000, // Precio normal $8.500/kg
      stock: 40,
      categoryId: carnesRojas.id,
      isOnSale: true,
      salePrice: 680000, // Precio oferta $6.800/kg
      saleEndDate: offerEndDate,
      discountPercent: 20,
    },
    {
      name: 'Chorizo Parrillero OFERTA',
      slug: 'chorizo-parrillero-oferta',
      description: 'Chorizo parrillero en oferta - ¡Precio increíble!',
      unitType: UnitType.PER_KG,
      price: 720000, // Precio normal $7.200/kg
      stock: 50,
      categoryId: embutidos.id,
      isOnSale: true,
      salePrice: 540000, // Precio oferta $5.400/kg
      saleEndDate: offerEndDate,
      discountPercent: 25,
    },
    {
      name: 'Milanesas de Pollo OFERTA x6',
      slug: 'milanesas-pollo-oferta-x6',
      description: 'Pack de 6 milanesas en oferta especial',
      unitType: UnitType.PER_UNIT,
      price: 650000, // Precio normal $6.500
      stock: 45,
      categoryId: pollo.id,
      isOnSale: true,
      salePrice: 487500, // Precio oferta $4.875
      saleEndDate: offerEndDate,
      discountPercent: 25,
    },
    {
      name: 'Pack Asado Familiar OFERTA',
      slug: 'pack-asado-familiar-oferta',
      description: 'Pack de 3kg de asado + 1kg de chorizo - Oferta especial',
      unitType: UnitType.PER_UNIT,
      price: 3270000, // Precio normal $32.700
      stock: 20,
      categoryId: carnesRojas.id,
      isOnSale: true,
      salePrice: 2616000, // Precio oferta $26.160
      saleEndDate: offerEndDate,
      discountPercent: 20,
    },
  ];

  for (const product of productosEnOferta) {
    await prisma.product.create({ data: product });
  }

  console.log('✅ Ofertas creadas');

  const totalProducts = await prisma.product.count();
  const totalCategories = await prisma.category.count();

  console.log(`\n🎉 Seed completado exitosamente!`);
  console.log(`📦 ${totalCategories} categorías creadas`);
  console.log(`🥩 ${totalProducts} productos creados`);
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
