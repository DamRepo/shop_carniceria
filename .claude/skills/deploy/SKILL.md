# Skill: Deploy a Produccion

Proceso de deploy para Carniceria El Negro en el VPS de produccion.

## Stack de deploy

- **Plataforma:** VPS con Node.js
- **Output:** Next.js standalone (`output: "standalone"` en next.config.js)
- **Base de datos:** PostgreSQL 15 en Docker (en produccion, instancia separada)
- **Dominio:** carniceriaelnegro.com (redirect 301 desde .tech)
- **CI/CD:** No configurado — deploy manual

## Pre-deploy checks (OBLIGATORIO)

```bash
# 1. Verificar tipos y lint
npm run check

# 2. Si hubo cambios en prisma/schema.prisma:
npm run prisma:generate
# Las migraciones se aplican en produccion con:
npm run prisma:migrate:deploy
```

## Variables de entorno en produccion

Verificar que el `.env` de produccion tenga actualizados:
- `DATABASE_URL` — apunta a la DB de produccion
- `NEXTAUTH_URL=https://carniceriaelnegro.com`
- `NEXTAUTH_SECRET` — generado con `openssl rand -base64 32`
- `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_PUBLIC_KEY`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `CLOUDINARY_URL`
- `RESEND_API_KEY`
- `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`
- `NEXT_PUBLIC_SITE_URL=https://carniceriaelnegro.com`

## Build de produccion

```bash
npm run build
# Genera: .next/standalone/
```

El build standalone es auto-contenido. Incluye:
- `.next/standalone/` — servidor Node.js
- `.next/standalone/.next/static/` — assets estaticos (copiar desde `.next/static/`)
- `.next/standalone/public/` — archivos publicos (copiar desde `public/`)

## Estructura del deploy en el servidor

```
/app/
  server.js           # Entry point (de .next/standalone/)
  .next/
    static/           # COPIAR de .next/static/
  public/             # COPIAR de public/
  .env                # Variables de entorno
  prisma/
    schema.prisma     # Necesario para Prisma
```

## Pasos de deploy (manual)

```bash
# En local — build
npm run build

# Copiar standalone al servidor (via SCP, rsync, etc.)
rsync -av .next/standalone/ usuario@servidor:/app/
rsync -av .next/static/ usuario@servidor:/app/.next/static/
rsync -av public/ usuario@servidor:/app/public/

# En el servidor — aplicar migraciones
cd /app && npx prisma migrate deploy

# Reiniciar el proceso Node.js
pm2 restart carniceria
# o: systemctl restart carniceria
```

## Post-deploy verification

Verificar manualmente:
1. `https://carniceriaelnegro.com` — home carga correctamente
2. Agregar producto al carrito y hacer checkout
3. Webhook de Mercado Pago activo (verificar en panel MP)
4. Notificaciones Telegram funcionando

## Rollback

Si algo falla:
1. Restaurar el standalone anterior (mantener backup del build previo)
2. Si las migraciones fallaron: contactar a DBA — las migraciones de Prisma son incrementales y pueden necesitar rollback manual

## Headers de seguridad configurados (next.config.js)

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `HSTS: max-age=63072000`
- `Permissions-Policy` restringida
