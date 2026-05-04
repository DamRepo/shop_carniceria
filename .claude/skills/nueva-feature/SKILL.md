# Skill: Nueva Feature

Guia paso a paso para implementar una nueva feature en Carniceria El Negro siguiendo las convenciones del proyecto.

## Cuando usar este skill

Cuando el usuario pide implementar una funcionalidad nueva: pantalla, endpoint, modelo de datos, integracion externa, etc.

## Pasos

### 1. Analisis previo

- Leer CLAUDE.md para recordar convenciones
- Identificar si la feature requiere:
  - Cambios en `prisma/schema.prisma` (nuevos campos o modelos)
  - Nuevas rutas de API en `app/api/`
  - Nuevas paginas en `app/(shop)/` o `app/admin/`
  - Nuevos componentes en `components/`
- Revisar si ya existe algo similar que pueda reutilizarse (shadcn/ui, hooks, utils)

### 2. Base de datos (si aplica)

```bash
# 1. Editar prisma/schema.prisma
# 2. Regenerar el client
npm run prisma:generate

# 3. Crear migracion en desarrollo
npx prisma migrate dev --name nombre-de-la-feature

# Nota: en produccion se usa prisma:migrate:deploy
```

Reglas de datos:
- Precios SIEMPRE en centavos (entero). Nunca float para dinero.
- Cantidades de productos en float (permiten kg decimales).
- IVA por categoria: 10.5% para carniceria, 21% general.

### 3. API Route (si aplica)

Ubicacion: `app/api/<dominio>/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

// Validar input con Zod
const Schema = z.object({ ... });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = Schema.parse(body);
    // logica...
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

Rutas admin: van en `app/api/admin/` y estan protegidas automaticamente por `middleware.ts`. No re-validar el role en cada handler.

### 4. Frontend

**Server Components** (default en `app/`):
```typescript
// app/(shop)/nueva-seccion/page.tsx
export default async function Page() {
  const data = await db.model.findMany(...);
  return <div>...</div>;
}
```

**Client Components** (con `'use client'`, solo cuando hay interactividad):
```typescript
// components/NuevaFeatureClient.tsx
"use client";
import { useState } from "react";
// Separar logica de cliente en archivos *Client.tsx
```

Usar componentes de `@/components/ui/` (shadcn/ui). No reinventar botones, inputs, dialogos, etc.

### 5. Notificaciones (si aplica)

```typescript
// Telegram para nuevos pedidos/eventos importantes
import { sendTelegramNotification } from "@/lib/telegram";

// Email transaccional
import { sendMail } from "@/lib/mail/send";
```

### 6. Verificacion final

```bash
npm run check         # typecheck + lint (obligatorio)
npm run dev           # Verificar en browser
```

Checklist:
- [ ] TypeScript sin errores (`npm run typecheck`)
- [ ] ESLint sin warnings (`npm run lint`)
- [ ] Feature funciona en browser en camino feliz
- [ ] Casos borde manejados (errores, estados vacios, loading)
- [ ] Si hay cambios de schema: migracion creada y aplicada en local
