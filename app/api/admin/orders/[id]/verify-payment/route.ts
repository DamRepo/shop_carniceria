import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyMpPaymentForOrder } from "@/lib/mp-payment-processor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: "Falta MERCADOPAGO_ACCESS_TOKEN" }, { status: 500 });
    }

    const result = await verifyMpPaymentForOrder(params.id, accessToken);

    if (result.outcome === "order_not_found") {
      return NextResponse.json({ error: result.message }, { status: 404 });
    }
    if (result.outcome === "not_mercado_pago") {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    if (result.outcome === "mp_error") {
      return NextResponse.json({ error: result.message }, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("POST verify-payment error:", e);
    return NextResponse.json({ error: "Error al verificar el pago" }, { status: 500 });
  }
}
