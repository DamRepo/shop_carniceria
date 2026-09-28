# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Qué es el proyecto

**Carnicería El Negro** es un e-commerce de carnicería argentina deployado en producción en `carniceriaelnegro.com`. Permite a clientes comprar cortes de carne, elaborados, minimercado y verdulería con tres métodos de pago: Mercado Pago (tarjetas), transferencia bancaria con comprobante, y efectivo. Tiene panel de administración para gestión de productos, categorías y pedidos.

## Comandos

**Regla importante:** después de editar `prisma/schema.prisma`, siempre ejecutar `prisma:generate` antes de `prisma:migrate:deploy`.

Deploy a producción: ver skill `deploy`.

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

Ver `.env.example`.

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
