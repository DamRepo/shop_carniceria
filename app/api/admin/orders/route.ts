import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_STATUSES = new Set([
  "PENDING_PAYMENT",
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
]);

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const role = (session?.user as any)?.role as string | undefined;

    if (!session?.user || !role) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const pageParam = searchParams.get("page");

    const PAGE_SIZE = 100;
    const page = Math.max(0, parseInt(pageParam ?? "0", 10) || 0);

    const where =
      statusParam && VALID_STATUSES.has(statusParam)
        ? { status: statusParam as any }
        : undefined;

    const orders = await prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE,
      select: {
        id: true,
        orderNumber: true,

        userId: true,
        customerName: true,
        phone: true,
        email: true,

        status: true,
        deliveryMethod: true,

        paymentMethod: true,
        paymentStatus: true,
        paidAt: true,
        mpPaymentId: true,
        mpStatus: true,
        mpPreferenceId: true,
        mpExternalReference: true,

        address: true,
        addressDetails: true,
        city: true,
        postalCode: true,
        notes: true,

        pickupDate: true,
        pickupTimeSlot: true,
        pickupNotes: true,

        cancelledAt: true,
        cancellationReason: true,
        cancelledBy: true,

        transferCode: true,
        transferStatus: true,
        transferProofUrl: true,
        transferProofMimeType: true,
        transferConfirmedAt: true,
        transferRejectedAt: true,
        transferRejectNote: true,

        subtotal: true,
        deliveryCost: true,
        total: true,

        createdAt: true,
        updatedAt: true,
        confirmedAt: true,

        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            createdAt: true,
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                image: true,
                unitType: true,
              },
            },
          },
        },

        checkoutSessions: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            mpStatus: true,
            mpPaymentId: true,
            mpPreferenceId: true,
            approvedAt: true,
            expiresAt: true,
            reservationReleased: true,
            subtotal: true,
            deliveryCost: true,
            total: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json(orders);
  } catch (e) {
    console.error("GET /api/admin/orders error:", e);
    return NextResponse.json(
      { error: "Error cargando órdenes" },
      { status: 500 }
    );
  }
}