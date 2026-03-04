import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // ajustá la ruta si tu authOptions está en otro lado

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BodyItem = { productId: string; quantity: number };

type Body = {
  customerName: string;
  phone: string;
  email?: string;
  deliveryMethod: "PICKUP" | "DELIVERY";
  address?: string;
  addressDetails?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
  items: BodyItem[];
};

type ProductPick = {
  id: string;
  name: string;
  price: number; // cents
  stock: number;
  unitType: "PER_KG" | "PER_UNIT";
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!accessToken || !siteUrl) {
      return NextResponse.json(
        { error: "Faltan MERCADOPAGO_ACCESS_TOKEN o NEXT_PUBLIC_SITE_URL" },
        { status: 500 }
      );
    }

    if (!body?.customerName || !body?.phone || !body?.deliveryMethod || !body?.items?.length) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    if (body.deliveryMethod === "DELIVERY" && !body.address) {
      return NextResponse.json({ error: "Dirección requerida para delivery" }, { status: 400 });
    }

    const centsToPesos = (cents: number) => Number((cents / 100).toFixed(2));

    // ✅ si hay usuario logueado, lo asociamos a la sesión
    // (si tu authOptions no existe/está en otro lado, decime dónde lo tenés)
    const session = await getServerSession(authOptions).catch(() => null);
    const userId = (session?.user as any)?.id as string | undefined;

    // 1) Traer productos reales
    const ids = body.items.map((i) => i.productId);

    const products = (await prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true, name: true, price: true, stock: true, unitType: true },
    })) as unknown as ProductPick[];

    const byId = new Map<string, ProductPick>(products.map((p) => [p.id, p]));

    // 2) Validar stock + calcular totales + armar snapshot + items MP
    let subtotalCents = 0;

    const itemsSnapshot: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }> = [];

    const mpItems = body.items.map((i) => {
      const p = byId.get(i.productId);
      if (!p) throw new Error(`Producto no encontrado: ${i.productId}`);

      const qty = Number(i.quantity ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error(`Cantidad inválida para ${p.name}`);

      // ⚠️ Stock: acá estás comparando Int vs qty Float. Mantengo tu lógica actual.
      // Si tu stock representa "unidades" también para kg, habría que normalizar a gramos.
      if ((p.stock ?? 0) < qty) throw new Error(`Stock insuficiente para ${p.name}`);

      const priceCents = Number(p.price ?? 0);

      if (p.unitType === "PER_KG") {
        // ✅ 1 item con total exacto para MP
        const grams = Math.round(qty * 1000);
        const lineCents = Math.round((priceCents * grams) / 1000);
        subtotalCents += lineCents;

        itemsSnapshot.push({
          productId: p.id,
          quantity: qty, // guardamos cantidad original (kg)
          unitPrice: priceCents,
          lineTotal: lineCents,
        });

        return {
          title: `${p.name} (${grams} g)`,
          quantity: 1,
          unit_price: centsToPesos(lineCents),
          currency_id: "ARS",
        };
      }

      // PER_UNIT
      const units = Math.round(qty);
      if (units <= 0) throw new Error(`Cantidad inválida para ${p.name}`);

      const lineCents = Math.round(priceCents * units);
      subtotalCents += lineCents;

      itemsSnapshot.push({
        productId: p.id,
        quantity: units, // guardamos unidades
        unitPrice: priceCents,
        lineTotal: lineCents,
      });

      return {
        title: p.name,
        quantity: units,
        unit_price: centsToPesos(priceCents),
        currency_id: "ARS",
      };
    });

    const deliveryCostCents = body.deliveryMethod === "DELIVERY" ? 50000 : 0;
    const totalCents = subtotalCents + deliveryCostCents;

    // 3) Crear CheckoutSession (NO Order)
    const cs = await prisma.checkoutSession.create({
      data: {
        userId: userId ?? null,

        customerName: body.customerName,
        phone: body.phone,
        email: body.email ?? undefined,
        deliveryMethod: body.deliveryMethod,
        address: body.address ?? undefined,
        addressDetails: body.addressDetails ?? undefined,
        city: body.city ?? undefined,
        postalCode: body.postalCode ?? undefined,
        notes: body.notes ?? undefined,

        itemsSnapshot,
        subtotal: subtotalCents,
        deliveryCost: deliveryCostCents,
        total: totalCents,

        status: "WAITING_MP",
      },
    });

    // 4) Items finales para MP (agregar envío como item)
    const itemsToSend =
      deliveryCostCents > 0
        ? [
            ...mpItems,
            {
              title: "Envío a domicilio",
              quantity: 1,
              unit_price: centsToPesos(deliveryCostCents),
              currency_id: "ARS",
            },
          ]
        : mpItems;

    // 5) Crear preferencia MP usando cs.id como external_reference
    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: itemsToSend,
        external_reference: cs.id,

        back_urls: {
          success: `${siteUrl}/checkout/mp/success?csId=${cs.id}`,
          failure: `${siteUrl}/checkout/mp/failure?csId=${cs.id}`,
          pending: `${siteUrl}/checkout/mp/pending?csId=${cs.id}`,
        },

        auto_return: "approved",
        notification_url: `${siteUrl}/api/mercadopago/webhook?source_news=webhooks`,
      }),
    });

    if (!mpRes.ok) {
      const detail = await mpRes.text().catch(() => "");
      console.error("MP STATUS:", mpRes.status);
      console.error("MP DETAIL:", detail);

      // marcamos la sesión como FAILED (no cancelamos una orden porque no existe)
      await prisma.checkoutSession.update({
        where: { id: cs.id },
        data: { status: "FAILED", mpStatus: `preference_error:${mpRes.status}` },
      });

      return NextResponse.json({ error: "Error Mercado Pago", detail }, { status: 502 });
    }

    const pref = await mpRes.json();

    // guardar preferenceId en la sesión
    await prisma.checkoutSession.update({
      where: { id: cs.id },
      data: {
        mpPreferenceId: pref?.id ?? null,
        mpStatus: "preference_created",
      },
    });

    return NextResponse.json({
      csId: cs.id,
      preferenceId: pref.id,
      initPoint: pref.init_point,
    });
  } catch (e: any) {
    console.error("MP preference error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Error creando preferencia" },
      { status: 500 }
    );
  }
}
