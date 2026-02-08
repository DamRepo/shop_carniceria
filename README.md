# Carnicería El Negro - E-commerce

Aplicación web de e-commerce para Carnicería El Negro, fábrica de embutidos.

## Características

- 📦 **Catálogo de productos** con filtros por categoría
- 🛍️ **Carrito de compras** con gestión de cantidades
- 📝 **Checkout completo** con formulario de datos y selección de entrega
- 📦 **Sistema de órdenes** guardadas en base de datos
- 🎨 **Tema oscuro** con colores rojo oscuro y naranja cálido
- 📱 **Diseño responsive** mobile-first

## Stack Tecnológico

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Estilos**: Tailwind CSS, shadcn/ui components
- **Estado**: Zustand
- **Base de datos**: PostgreSQL con Prisma ORM
- **Animaciones**: Framer Motion

## Instalación

### Requisitos Previos

- Node.js 18+
- Yarn
- PostgreSQL (o usar la base de datos ya configurada)

### Pasos de Instalación

1. Clonar el repositorio y navegar al directorio del proyecto

2. Instalar dependencias:
```bash
cd nextjs_space
yarn install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
```
Editar `.env` con tus credenciales (la base de datos ya está configurada por defecto)

4. Generar cliente de Prisma:
```bash
yarn prisma generate
```

5. Aplicar migraciones de base de datos:
```bash
yarn prisma db push
```

6. Poblar la base de datos con datos de ejemplo:
```bash
yarn prisma db seed
```

7. Iniciar servidor de desarrollo:
```bash
yarn dev
```

8. Abrir [http://localhost:3000](http://localhost:3000) en tu navegador

## Scripts Disponibles

- `yarn dev` - Inicia el servidor de desarrollo
- `yarn build` - Construye la aplicación para producción
- `yarn start` - Inicia el servidor de producción
- `yarn lint` - Ejecuta el linter
- `yarn prisma db seed` - Pobla la base de datos con datos de ejemplo
- `yarn prisma studio` - Abre Prisma Studio para explorar la base de datos

## Estructura del Proyecto

```
nextjs_space/
├── app/
│   ├── api/              # API routes
│   │   ├── products/     # Endpoints de productos
│   │   ├── categories/   # Endpoints de categorías
│   │   └── orders/       # Endpoints de órdenes
│   ├── productos/        # Página de listado y detalle
│   ├── carrito/          # Página de carrito
│   ├── checkout/         # Página de checkout
│   ├── orden-confirmada/ # Página de confirmación
│   ├── layout.tsx        # Layout principal
│   └── page.tsx          # Página de inicio
├── components/
│   ├── ui/               # Componentes UI base
│   ├── header.tsx        # Header con navegación
│   ├── footer.tsx        # Footer
│   └── product-card.tsx  # Card de producto
├── lib/
│   ├── db.ts             # Cliente de Prisma
│   ├── store.ts          # Store de Zustand (carrito)
│   └── utils-format.ts   # Utilidades de formato
├── prisma/
│   └── schema.prisma     # Schema de base de datos
├── scripts/
│   └── seed.ts           # Script de seed
└── public/            # Archivos estáticos
```

## Modelo de Datos

### Category
- `id`: ID único
- `name`: Nombre de la categoría
- `slug`: Slug para URLs
- `description`: Descripción opcional

### Product
- `id`: ID único
- `name`: Nombre del producto
- `slug`: Slug para URLs
- `description`: Descripción
- `image`: URL de la imagen
- `unitType`: Tipo de unidad (PER_KG)
- `price`: Precio en centavos
- `stock`: Stock disponible
- `isActive`: Producto activo
- `categoryId`: ID de categoría

### Order
- `id`: ID único
- `orderNumber`: Número de orden
- `customerName`: Nombre del cliente
- `phone`: Teléfono
- `email`: Email (opcional)
- `status`: Estado de la orden
- `deliveryMethod`: Método de entrega (PICKUP | DELIVERY)
- `address`, `city`, `postalCode`: Datos de dirección
- `notes`: Notas adicionales
- `subtotal`, `deliveryCost`, `total`: Totales en centavos

### OrderItem
- `id`: ID único
- `orderId`: ID de la orden
- `productId`: ID del producto
- `quantity`: Cantidad
- `unitPrice`: Precio unitario en centavos
- `lineTotal`: Total de la línea en centavos

## Funcionalidades Pendientes (Futuras)

- 🔐 Autenticación con NextAuth
- 🛠️ Panel de administración
- 💳 Integración de pagos real (Mercado Pago, etc.)
- 📷 Subida de imágenes de productos
- 📧 Notificaciones por email
- 📋 Historial de órdenes para clientes

## Licencia

Todos los derechos reservados - Carnicería El Negro
