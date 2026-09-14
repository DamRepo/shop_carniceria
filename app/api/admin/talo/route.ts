import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { consultarPagoTalo } from "@/lib/talo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ReviewReason = "OVERPAID" | "UNDERPAID" | "MISMATCH";

function getReviewReason(taloStatus: string | null): ReviewReason | null {
  if (taloStatus === "OVERPAID") return "OVERPAID";
  if (taloStatus === "UNDERPAID") return "UNDERPAID";
  if (taloStatus?.startsWith("mismatch:")) return "MISMATCH";
  return null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const role = (session?.user as any)?.role as string | undefined;

    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const orders = await prisma.order.findMany({
      where: {
        paymentMethod: "TALO_PAY",
        OR: [
          { taloStatus: { in: ["OVERPAID", "UNDERPAID"] } },
          { taloStatus: { startsWith: "mismatch:" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        orderNumber: true,
        taloStatus: true,
        taloPaymentId: true,
        taloCvu: true,
        taloAlias: true,
        customerName: true,
        phone: true,
        email: true,
        deliveryMethod: true,
        address: true,
        pickupDate: true,
        pickupTimeSlot: true,
        subtotal: true,
        deliveryCost: true,
        total: true,
        paymentStatus: true,
        status: true,
        createdAt: true,
        items: {
          select: {
            quantity: true,
            lineTotal: true,
            product: { select: { name: true, unitType: true } },
          },
        },
      },
    });

    // Nunca confiamos en el monto guardado (no hay ninguno persistido, de hecho):
    // re-consultamos Talo para cada orden en revisión, igual que hace la
    // confirmación real (lib/talo-payment-processor.ts). Si la consulta falla
    // para una orden puntual, la mostramos igual sin el monto pagado en vez de
    // romper el listado completo.
    const withAmounts = await Promise.all(
      orders.map(async (o) => {
        const expectedAmountCents = o.total;
        let paidAmountCents: number | null = null;
        let paidAmountError = false;

        if (o.taloPaymentId) {
          try {
            const pago = await consultarPagoTalo(o.taloPaymentId);
            const amount = pago.price?.amount;
            paidAmountCents =
              typeof amount === "number" && Number.isFinite(amount)
                ? Math.round(amount * 100)
                : null;
          } catch (err) {
            console.error("[admin/talo] Error consultando pago en Talo:", err, {
              orderId: o.id,
              taloPaymentId: o.taloPaymentId,
            });
            paidAmountError = true;
          }
        }

        return {
          id: o.id,
          orderNumber: o.orderNumber,
          reviewReason: getReviewReason(o.taloStatus),
          taloStatus: o.taloStatus,
          taloCvu: o.taloCvu,
          taloAlias: o.taloAlias,
          customerName: o.customerName,
          phone: o.phone,
          email: o.email,
          deliveryMethod: o.deliveryMethod,
          address: o.address,
          pickupDate: o.pickupDate,
          pickupTimeSlot: o.pickupTimeSlot,
          paymentStatus: o.paymentStatus,
          status: o.status,
          createdAt: o.createdAt,
          expectedAmountCents,
          paidAmountCents,
          diffCents: paidAmountCents != null ? paidAmountCents - expectedAmountCents : null,
          paidAmountError,
          items: o.items,
        };
      })
    );

    return NextResponse.json(withAmounts);
  } catch (e) {
    console.error("GET /api/admin/talo error:", e);
    return NextResponse.json({ error: "Error cargando pagos Talo" }, { status: 500 });
  }
}
