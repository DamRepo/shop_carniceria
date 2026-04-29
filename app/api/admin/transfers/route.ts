import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const role = (session?.user as any)?.role as string | undefined;

    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");

    const VALID_STATUSES = new Set([
      "AWAITING_PROOF",
      "PENDING_REVIEW",
      "CONFIRMED",
      "REJECTED",
    ]);

    const whereStatus =
      statusParam && VALID_STATUSES.has(statusParam)
        ? { transferStatus: statusParam as any }
        : {
            transferStatus: {
              in: ["AWAITING_PROOF", "PENDING_REVIEW"] as any[],
            },
          };

    const orders = await (prisma.order.findMany as any)({
      where: {
        paymentMethod: "BANK_TRANSFER",
        ...whereStatus,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        orderNumber: true,
        transferCode: true,
        transferStatus: true,
        transferProofUrl: true,
        transferProofMimeType: true,
        transferConfirmedAt: true,
        transferRejectedAt: true,
        transferRejectNote: true,
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

    return NextResponse.json(orders);
  } catch (e) {
    console.error("GET /api/admin/transfers error:", e);
    return NextResponse.json({ error: "Error cargando transferencias" }, { status: 500 });
  }
}
