# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript check (tsc --noEmit)
npm run check        # typecheck + lint together

npm run prisma:generate        # Regenerate Prisma client after schema changes
npm run prisma:studio          # Open Prisma Studio (DB GUI)
npm run prisma:migrate:deploy  # Apply migrations to production DB
npm run prisma:seed            # Seed DB with example data
```

After editing `prisma/schema.prisma`, always run `prisma:generate` before `prisma:migrate:deploy`.

## Architecture

**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · shadcn/ui · Prisma (PostgreSQL) · NextAuth v4 · Zustand · Mercado Pago

### Route groups

- `app/(shop)/` — Public storefront (route group, shares a shop layout). Contains category pages (`/carniceria`, `/elaborados`, etc.), product pages, cart, checkout, auth, and user-facing static pages.
- `app/admin/` — Protected admin panel (requires ADMIN role). Product/category/order management with its own layout.
- `app/api/` — API routes split by domain: `admin/` (protected), `auth/`, `products/`, `orders/`, `mercadopago/`, `checkout-session/`, `support/`.

### Auth & middleware

`middleware.ts` guards `/admin/*` and `/api/admin/*` via NextAuth JWT. Non-authenticated users are redirected to `/auth/login`; API requests get 401/403. Role field is stored in the JWT and surfaced on `session.user.role`.

`lib/auth.ts` configures the NextAuth Credentials provider: email normalization, bcrypt verification, rate limiting (5 attempts/15 min/IP via `lib/rate-limit.ts`), and JWT/session callbacks that inject `role` and `phone`.

### Database (Prisma)

Key models:
- **Product** — has `unitType` (PER_KG | PER_UNIT), `reservedStock`, purchase rules (`minPurchaseQty`, `maxPurchaseQty`, `qtyStep`, `allowsDecimals`), VAT fields, and sale/discount support.
- **Order / OrderItem / CheckoutSession** — full Mercado Pago payment flow with webhook-driven status transitions.
- **Category** — hierarchical (self-referential parent/children).
- **User** — roles: CUSTOMER, ADMIN, EMPLOYEE.

Prisma client singleton is exported from `lib/db.ts`.

### Cart store (Zustand)

`lib/store.ts` implements a persistent cart (LocalStorage) with a quantity normalization engine that handles:
- PER_KG products: decimal quantities, dynamic stepping (0.1–0.5 kg)
- PER_UNIT products: whole-number quantities
- Per-product purchase rules (min/max, fixed steps, decimal restrictions)

Prices are stored and calculated in **centavos** (integer).

### Payment flow (Mercado Pago)

1. `POST /api/mercadopago/preference` — creates a MP preference and a `CheckoutSession` record.
2. MP redirects to `/checkout/mp/{success|pending|failure}` callbacks.
3. `POST /api/mercadopago/webhook` — receives IPN notifications and updates `Order`/`CheckoutSession` status, triggers stock deductions.

### Image handling

Uploads go through `lib/uploads/upload-images.ts` (Cloudinary). Images are served via `res.cloudinary.com`; `next.config.js` whitelists this domain for `<Image>` optimization.

### Notifications

`lib/telegram.ts` — Telegram bot notifications (e.g. new order alerts).
`lib/mail/` — Nodemailer + Resend for transactional emails (order confirmation, password reset, welcome).

## Environment variables

See `.env.example` for required keys:
`DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

## Build output

`next.config.js` uses `output: "standalone"` for VPS deployment. Build directory can be overridden via `NEXT_DIST_DIR`.
