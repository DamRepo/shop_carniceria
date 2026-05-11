import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_STATUSES = [
  "PENDING_PAYMENT",
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
] as const;

type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

function isAllowedStatus(value: unknown): value is AllowedStatus {
  return (
    typeof value === "string" &&
    ALLOWED_STATUSES.includes(value as AllowedStatus)
  );
}

// Transiciones válidas de estado. COMPLETED y CANCELLED son terminales.
const VALID_TRANSITIONS: Record<AllowedStatus, readonly AllowedStatus[]> = {
  PENDING_PAYMENT: ["PENDING", "CONFIRMED", "CANCELLED"],
  PENDING:         ["CONFIRMED", "CANCELLED"],
  CONFIRMED:       ["PREPARING", "CANCELLED"],
  PREPARING:       ["READY", "CANCELLED"],
  READY:           ["COMPLETED", "CANCELLED"],
  COMPLETED:       [],
  CANCELLED:       [],
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);

    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orderId = params?.id?.trim();

    if (!orderId) {
      return NextResponse.json({ error: "Falta id de orden" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const nextStatus = body?.status;

    if (!isAllowedStatus(nextStatus)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const current = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        confirmedAt: true,
        cancelledAt: true,
        paymentStatus: true,
        items: { select: { productId: true, quantity: true } },
      },
    });

    if (!current) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    const allowedNext = VALID_TRANSITIONS[current.status as AllowedStatus] ?? [];
    if (!allowedNext.includes(nextStatus)) {
      return NextResponse.json(
        {
          error: `Transición inválida: ${current.status} → ${nextStatus}`,
          allowedNext,
        },
        { status: 422 }
      );
    }

    const shouldSetConfirmedAt =
      nextStatus === "CONFIRMED" ||
      nextStatus === "PREPARING" ||
      nextStatus === "READY" ||
      nextStatus === "COMPLETED";

    const isCancelling = nextStatus === "CANCELLED";

    const data: {
      status: AllowedStatus;
      confirmedAt?: Date;
      cancelledAt?: Date | null;
      cancellationReason?: string | null;
      cancelledBy?: string | null;
    } = {
      status: nextStatus,
    };

    // Si pasa a un estado operativo y todavía no fue confirmada
    if (shouldSetConfirmedAt && !current.confirmedAt) {
      data.confirmedAt = new Date();
    }

    // Si pasa a cancelada y todavía no estaba cancelada
    if (isCancelling && !current.cancelledAt) {
      data.cancelledAt = new Date();
      data.cancelledBy = "ADMIN";
    }

    // Si deja de estar cancelada, limpiamos datos de cancelación
    if (!isCancelling && current.cancelledAt) {
      data.cancelledAt = null;
      data.cancellationReason = null;
      data.cancelledBy = null;
    }

    // Optimistic lock + restauración de stock en una sola transacción
    const { count } = await prisma.$transaction(async (tx) => {
      const result = await tx.order.updateMany({
        where: { id: orderId, status: current.status },
        data,
      });

      if (result.count > 0 && isCancelling && !current.cancelledAt) {
        for (const item of current.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
              reservedStock: { decrement: item.quantity },
            },
          });
        }
      }

      return result;
    });

    if (count === 0) {
      return NextResponse.json(
        { error: "La orden fue modificada por otro usuario. Recargá la página." },
        { status: 409 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        confirmedAt: true,
        cancelledAt: true,
        cancellationReason: true,
        cancelledBy: true,
        subtotal: true,
        deliveryCost: true,
        total: true,
        deliveryMethod: true,
        address: true,
        addressDetails: true,
        city: true,
        postalCode: true,
        notes: true,
        pickupDate: true,
        pickupTimeSlot: true,
        pickupNotes: true,
        customerName: true,
        phone: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            product: {
              select: {
                id: true,
                name: true,
                unitType: true,
                image: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    console.error("Error updating order:", error);

    return NextResponse.json(
      { error: "Error al actualizar orden" },
      { status: 500 }
    );
  }
}