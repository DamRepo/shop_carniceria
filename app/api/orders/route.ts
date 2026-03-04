import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendOrderConfirmationEmail } from "@/lib/mail/actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type IncomingItem = {
  productId: string;
  quantity: number; // PER_UNIT: unidades (int). PER_KG: kg (float)
};

function safeNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function computeStockDecrement(unitType: "PER_UNIT" | "PER_KG", qty: number): number {
  if (unitType === "PER_UNIT") {
    // unidades
    return Math.max(1, Math.round(qty));
  }
  // PER_KG (mínimo seguro)
  return Math.max(1, Math.ceil(qty));
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const sessionUserId = (session?.user as any)?.id as string | undefined;

    // ✅ Evita FK: solo guardamos userId si existe en DB
    let safeUserId: string | null = null;
    if (sessionUserId) {
      const exists = await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: { id: true },
      });
      if (exists) safeUserId = sessionUserId;
    }

    const body = await request.json().catch(() => null);

    const {
      customerName,
      phone,
      email,
      deliveryMethod,
      address,
      addressDetails,
      city,
      postalCode,
      notes,
      items,
    } = body ?? {};

    // Validaciones básicas
    if (!customerName || !phone || !deliveryMethod || !items || (items?.length ?? 0) === 0) {
      throw new HttpError(400, "Datos incompletos");
    }

    if (deliveryMethod === "DELIVERY" && !address) {
      throw new HttpError(400, "Dirección requerida para delivery");
    }

    const incomingItems = items as IncomingItem[];

    // Sanitizar items
    const normalizedItems: IncomingItem[] = incomingItems.map((i) => ({
      productId: String((i as any)?.productId ?? ""),
      quantity: safeNumber((i as any)?.quantity),
    }));

    for (const it of normalizedItems) {
      if (!it.productId) throw new HttpError(400, "Item sin productId");
      if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
        throw new HttpError(400, `Cantidad inválida para producto ${it.productId}`);
      }
    }

    // 1) Traer productos activos
    const ids = Array.from(new Set(normalizedItems.map((i) => i.productId)));

    const products = await prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true, name: true, price: true, stock: true, unitType: true },
    });

    const byId = new Map(products.map((p) => [p.id, p]));

    // Si falta algún producto (inactivo o inexistente), lo cortamos como 400
    if (products.length !== ids.length) {
      const missing = ids.filter((id) => !byId.has(id));
      throw new HttpError(400, `Producto no encontrado o inactivo: ${missing.join(", ")}`);
    }

    // 2) Recalcular precios desde DB (NO confiar en frontend)
    let subtotalCents = 0;

    const orderItems = normalizedItems.map((i) => {
      const p = byId.get(i.productId)!;

      const qty = i.quantity;
      const priceCents = Number(p.price ?? 0);

      if (!Number.isFinite(priceCents) || priceCents < 0) {
        throw new HttpError(500, `Precio inválido en DB para ${p.name}`);
      }

      let lineTotalCents = 0;

      if (p.unitType === "PER_KG") {
        // qty en kg, priceCents = centavos por kg
        const grams = Math.round(qty * 1000);
        if (grams <= 0) throw new HttpError(400, `Cantidad inválida para ${p.name}`);
        lineTotalCents = Math.round((priceCents * grams) / 1000);
      } else {
        // PER_UNIT
        const units = Math.round(qty);
        if (units <= 0) throw new HttpError(400, `Cantidad inválida para ${p.name}`);
        lineTotalCents = Math.round(priceCents * units);
      }

      subtotalCents += lineTotalCents;

      return {
        productId: p.id,
        quantity: qty,
        unitPrice: priceCents,
        lineTotal: lineTotalCents,
      };
    });

    const deliveryCostCents = deliveryMethod === "DELIVERY" ? 50000 : 0;
    const totalCents = subtotalCents + deliveryCostCents;

    // 3) Decrementos de stock (agregado por productoId para evitar doble decrement si vienen repetidos)
    const decByProductId = new Map<string, number>();
    for (const it of normalizedItems) {
      const p = byId.get(it.productId)!;
      const dec = computeStockDecrement(p.unitType, it.quantity);
      decByProductId.set(it.productId, (decByProductId.get(it.productId) ?? 0) + dec);
    }

    // 4) Crear Order + items y descontar stock ATÓMICO
    const created = await prisma.$transaction(async (tx) => {
      // Descontar stock primero (o después) da igual si está todo dentro de transacción,
      // pero descontarlo ANTES evita crear una Order si no hay stock.
      for (const [productId, dec] of decByProductId.entries()) {
        const updated = await tx.product.updateMany({
          where: {
            id: productId,
            isActive: true,
            stock: { gte: dec },
          },
          data: { stock: { decrement: dec } },
        });

        if (updated.count === 0) {
          const p = byId.get(productId);
          throw new HttpError(400, `Stock insuficiente para ${p?.name ?? "producto"} (${productId})`);
        }
      }

      const order = await tx.order.create({
        data: {
          userId: safeUserId,

          customerName,
          phone,
          email: email ?? undefined,
          deliveryMethod,
          address: address ?? undefined,
          addressDetails: addressDetails ?? undefined,
          city: city ?? undefined,
          postalCode: postalCode ?? undefined,
          notes: notes ?? undefined,

          paymentMethod: "CASH",
          paymentStatus: "PENDING_LOCAL",
          status: "PENDING",

          subtotal: subtotalCents,
          deliveryCost: deliveryCostCents,
          total: totalCents,

          items: { create: orderItems },
        },
        select: { id: true, orderNumber: true },
      });

      return order;
    });

    // 5) Enviar email (si hay email) — no debe tumbar el checkout
    if (email) {
      const totalText = `$${(totalCents / 100).toFixed(2)}`;

      const emailItems = orderItems.map((it) => {
        const p = byId.get(it.productId);
        return {
          name: p?.name ?? "Producto",
          quantity: Number(it.quantity),
          // ✅ En el email, la columna "Precio" mostrará el total de la línea (cantidad incluida)
          unitPrice: Number(it.lineTotal) / 100,
        };
      });

      try {
        await sendOrderConfirmationEmail({
          to: email,
          customerName,
          orderId: created.orderNumber,
          items: emailItems,
          totalText,
        });
      } catch (err) {
        console.error("Order created but confirmation email failed:", err);
      }
    }

    return NextResponse.json(
      { orderId: created.id, orderNumber: created.orderNumber },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("CASH order error:", e);

    const status = typeof e?.status === "number" ? e.status : 500;
    const message = status >= 500 ? "Error creando orden" : (e?.message ?? "Error creando orden");

    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * GET /api/orders (ADMIN)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const role = (session?.user as any)?.role as string | undefined;

    if (!session?.user || !role) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: true } },
      },
    });

    return NextResponse.json(orders);
  } catch (e) {
    console.error("GET /api/orders error:", e);
    return NextResponse.json({ error: "Error cargando órdenes" }, { status: 500 });
  }
}