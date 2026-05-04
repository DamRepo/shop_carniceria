# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Qué es el proyecto

**Carnicería El Negro** es un e-commerce de carnicería argentina deployado en producción en `carniceriaelnegro.com`. Permite a clientes comprar cortes de carne, elaborados, minimercado y verdulería con tres métodos de pago: Mercado Pago (tarjetas), transferencia bancaria con comprobante, y efectivo. Tiene panel de administración para gestión de productos, categorías y pedidos.

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 App Router (Turbopack en dev) |
| Lenguaje | TypeScript 5 — modo strict |
| UI | Tailwind CSS 3 + shadcn/ui (Radix UI) |
| Estado cliente | Zustand 5 (carrito persiste en localStorage) |
| Base de datos | PostgreSQL 15 vía Prisma ORM 6 |
| Auth | NextAuth v4 — provider Credentials, JWT |
| Pagos | Mercado Pago (preferencias + webhooks IPN) |
| Imágenes | Cloudinary CDN |
| Email | Resend (principal) + Nodemailer (backup) |
| Notificaciones | Telegram bot para nuevos pedidos |
| Deploy | Node.js standalone (`output: "standalone"`) en VPS |

## Comandos

```bash
npm run dev                    # Dev server con Turbopack
npm run build                  # Build de producción
npm run lint                   # ESLint
npm run typecheck              # TypeScript check (tsc --noEmit)
npm run check                  # typecheck + lint juntos

npm run prisma:generate        # Regenerar Prisma client tras cambios al schema
npm run prisma:studio          # GUI de base de datos
npm run prisma:migrate:deploy  # Aplicar migraciones en producción
npm run prisma:seed            # Seed de datos de ejemplo

npm run clean-proofs           # Eliminar comprobantes viejos de Cloudinary
npm run clean-proofs:dry       # Dry-run del limpiador de comprobantes
```

**Regla importante:** después de editar `prisma/schema.prisma`, siempre ejecutar `prisma:generate` antes de `prisma:migrate:deploy`.

## Estructura de carpetas

```
shop_carniceria/
├── app/
│   ├── (shop)/             # Storefront público (layout compartido)
│   │   ├── carniceria/     # Página de categoría carnicería
│   │   ├── elaborados/     # Página de elaborados
│   │   ├── minimercado/    # Minimercado
│   │   ├── fruteria-y-verduleria/
│   │   ├── productos/[slug]/   # Detalle de producto
│   │   ├── carrito/        # Carrito de compras
│   │   ├── checkout/       # Flujo de checkout
│   │   │   ├── metodo-pago/
│   │   │   ├── transferencia/
│   │   │   └── mp/{success|pending|failure}/
│   │   ├── ofertas/        # Productos en oferta
│   │   ├── auth/           # Login, registro, reset password
│   │   ├── perfil/         # Perfil de usuario
│   │   ├── mis-compras/    # Historial de pedidos
│   │   └── sobre-nosotros/ # Páginas estáticas
│   ├── admin/              # Panel admin (protegido, rol ADMIN)
│   │   ├── productos/      # CRUD de productos
│   │   ├── categorias/     # CRUD de categorías
│   │   └── ofertas/        # Gestión de ofertas
│   └── api/                # Route handlers
│       ├── auth/           # NextAuth + registro + reset password
│       ├── products/       # Productos públicos
│       ├── orders/         # Pedidos de usuario
│       ├── mercadopago/    # Preferencias + webhook IPN
│       ├── checkout-session/
│       ├── admin/          # Rutas protegidas de admin
│       │   ├── products/   # CRUD admin de productos
│       │   ├── categories/ # CRUD admin de categorías
│       │   ├── orders/     # Gestión de pedidos
│       │   ├── transfers/  # Validación de transferencias
│       │   └── stats/      # Estadísticas de ventas
│       └── support/
├── components/
│   ├── ui/                 # shadcn/ui (40+ componentes base)
│   ├── checkout-*.tsx      # Componentes del flujo de pago
│   ├── product-*.tsx       # Tarjetas y sliders de productos
│   ├── admin/              # Componentes del panel admin
│   └── orders/             # Comprobantes y estado de pedidos
├── lib/
│   ├── db.ts               # Singleton de Prisma client
│   ├── auth.ts             # Configuración NextAuth
│   ├── store.ts            # Zustand cart store (con normalización de cantidades)
│   ├── checkout-store.ts   # Estado del flujo de checkout
│   ├── types/              # Tipos TypeScript compartidos
│   ├── utils/              # Utilidades generales y de formato
│   ├── mail/               # Sistema de email (templates + send)
│   ├── uploads/            # Cloudinary (imágenes de productos y comprobantes)
│   ├── auth/               # Reset tokens y lógica de contraseñas
│   ├── telegram.ts         # Notificaciones Telegram
│   ├── rate-limit.ts       # Rate limiter en memoria (5 intentos/15min/IP)
│   ├── shipping.ts         # Cálculo de costos de envío
│   └── business-hours.ts   # Horarios del negocio
├── prisma/
│   ├── schema.prisma       # 9 modelos + 8 enums
│   ├── migrations/         # 17 migraciones históricas
│   └── seed.ts             # Seed de categorías, productos y admin
├── scripts/
│   ├── seed.ts             # Script de seed
│   └── clean-old-proofs.ts # Limpieza de comprobantes en Cloudinary
├── public/                 # Assets estáticos (logos, imágenes, favicons)
├── middleware.ts           # Protección de rutas /admin/* y /api/admin/*
├── next.config.js          # Standalone output, Cloudinary domain, headers de seguridad
├── docker-compose.yml      # PostgreSQL 15 para desarrollo local
└── .env.example            # Variables de entorno requeridas
```

## Modelos Prisma clave

- **Product** — `unitType` (PER_KG | PER_UNIT), `reservedStock`, reglas de compra (`minPurchaseQty`, `maxPurchaseQty`, `qtyStep`, `allowsDecimals`), IVA (`vatRate`), soporte de ofertas (`isOnSale`, `salePrice`, `saleEndDate`).
- **Order / OrderItem / CheckoutSession** — flujo completo de Mercado Pago con transiciones de estado por webhook.
- **Category** — jerárquica (relación `parent`/`children`), con `vatRate` propio (10.5% carne, 21% general).
- **User** — roles: `CUSTOMER`, `ADMIN`, `EMPLOYEE`.
- **TransferCodeSequence** — auto-incremento de códigos de transferencia (`CN-YYYY-NNNNNN`).

Singleton de Prisma: `lib/db.ts`.

## Auth & middleware

`middleware.ts` protege `/admin/*` y `/api/admin/*` via NextAuth JWT. Sin autenticación → redirect a `/auth/login`. API → 401/403. El campo `role` vive en el JWT y se expone en `session.user.role`.

`lib/auth.ts`: proveedor Credentials, normalización de email, bcrypt, rate limiting (5 intentos/15min/IP).

## Cart store (Zustand)

`lib/store.ts` — carrito persistido en localStorage con motor de normalización de cantidades:
- Productos PER_KG: decimales, stepping dinámico (0.1 kg bajo 1 kg, 0.5 kg sobre 1 kg)
- Productos PER_UNIT: enteros
- Reglas por producto: min/max, step fijo, sin decimales

Precios almacenados en **centavos** (entero). Nunca floats para dinero.

## Flujo de pago (Mercado Pago)

1. `POST /api/mercadopago/preference` → crea preferencia MP + registro `CheckoutSession`.
2. MP redirige a `/checkout/mp/{success|pending|failure}`.
3. `POST /api/mercadopago/webhook` → recibe IPN, actualiza `Order`/`CheckoutSession`, descuenta stock.

## Cómo está el deploy

- **Output:** `next build` genera `.next/standalone/` (build autocontenido).
- **Base de datos:** PostgreSQL 15 en Docker (`docker-compose.yml`) — en dev local. En producción, instancia separada.
- **Dominio:** `carniceriaelnegro.com` (redirect permanente desde `.tech`).
- **Proceso de deploy manual:**
  ```bash
  npm run check                        # Verificar tipos y lint
  npm run prisma:generate              # Si hubo cambios al schema
  npm run prisma:migrate:deploy        # Aplicar migraciones en producción
  npm run build                        # Generar .next/standalone/
  # Copiar standalone + static + public al servidor
  # Reiniciar proceso Node.js (PM2 u otro)
  ```
- **Variables de entorno requeridas:** ver `.env.example`.
- **No hay CI/CD configurado** actualmente — deploy es manual.

## Convenciones del código

### Componentes
- Server Components por defecto. `'use client'` solo para interactividad real.
- Componentes de página en `app/` (pueden ser async). Componentes complejos con lógica de cliente en archivos separados (e.g., `ProductDetailClient.tsx`).

### API Routes
- Estructura por dominio en `app/api/`. Handlers con `NextRequest`/`NextResponse`.
- Validación de input con **Zod**. Forms con `react-hook-form` + `@hookform/resolvers/zod`.
- Rutas admin validadas por middleware (no re-validar el role en cada handler).

### Base de datos
- Todas las queries via Prisma client (`lib/db.ts`).
- Precios siempre en centavos (entero). Nunca `float` para dinero.
- Cantidades de productos en `float` (kg decimales).

### Imports
- Path alias `@/` para imports desde la raíz: `import { db } from '@/lib/db'`.
- shadcn/ui components desde `@/components/ui/`.

### Estilos
- Tailwind CSS con variables CSS en HSL. Dark mode via clase.
- shadcn/ui para componentes base. No reinventar lo que ya está en `components/ui/`.

### Estado global
- Zustand para estado del carrito y checkout.
- No usar Context salvo SessionProvider de NextAuth.

### Seguridad
- Rate limiting en auth (5 intentos/15 min/IP) vía `lib/rate-limit.ts`.
- Hashing de passwords con bcryptjs.
- Sessions con JWT (NextAuth).
- Headers de seguridad configurados en `next.config.js`.

## Variables de entorno

Ver `.env.example`:

```
DATABASE_URL               # PostgreSQL connection string
NEXTAUTH_URL               # https://carniceriaelnegro.com
NEXTAUTH_SECRET            # Secret de NextAuth
CLOUDINARY_URL             # Credenciales Cloudinary
MERCADOPAGO_ACCESS_TOKEN   # Token de Mercado Pago
MERCADOPAGO_PUBLIC_KEY     # Clave pública de MP
MERCADOPAGO_WEBHOOK_SECRET # Para validar webhooks
RESEND_API_KEY             # API de Resend (emails)
TELEGRAM_BOT_TOKEN         # Bot de Telegram
TELEGRAM_CHAT_ID           # Chat ID para notificaciones
NEXT_PUBLIC_WHATSAPP_NUMBER
```

## Reglas de calidad para agentes

### TypeScript
- **Nunca usar `any`**. Si el tipo no se conoce, usar `unknown` y narrowing, o definir una interfaz.
- Antes de usar una propiedad de un objeto, verificar que esté declarada en su tipo. Si no está, agregarla.
- Siempre correr `npm run typecheck` antes de dar una tarea por terminada.
- Los tipos locales (como intersecciones `Product & {...}`) deben incluir TODAS las propiedades que se usen en el bloque de código.

### ESLint
- Nunca dejar variables, imports o parámetros declarados sin usar.
- Si un parámetro es requerido por la firma pero no se usa, prefijar con `_` (ej: `_request`).
- Nunca dejar `console.log` en código de producción.

### Antes de terminar cualquier tarea
1. Correr `npm run check` (typecheck + lint).
2. Si hay errores de TypeScript → corregirlos, no ignorarlos.
3. Si hay warnings de ESLint → evaluar si son ignorables o requieren fix.
4. Nunca usar `// @ts-ignore` o `// eslint-disable` sin justificación explícita en un comentario.

### Consistencia con el modelo de datos
- El schema fuente de verdad es `prisma/schema.prisma`.
- Antes de crear tipos locales que extiendan `Product`, `Order`, `User`, etc., verificar los campos reales en el schema.
- Si el schema tiene `minPurchaseQty`, ese campo debe estar en todos los tipos que extienden `Product`.

### Seguridad
- Nunca exponer variables de entorno al cliente (`NEXT_PUBLIC_` solo para datos públicos).
- Nunca logear datos sensibles (passwords, tokens, datos de tarjetas).
