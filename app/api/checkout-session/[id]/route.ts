import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }

    const cs = await prisma.checkoutSession.findUnique({
      where: { id },
      select: {
        userId: true,
        id: true,
        status: true,
        mpStatus: true,
        mpPaymentId: true,
        mpPreferenceId: true,
        approvedAt: true,
        createdAt: true,
        updatedAt: true,

        customerName: true,
        phone: true,
        email: true,
        deliveryMethod: true,

        address: true,
        addressDetails: true,
        city: true,
        postalCode: true,
        notes: true,

        pickupDate: true,
        pickupTimeSlot: true,
        pickupNotes: true,

        subtotal: true,
        deliveryCost: true,
        total: true,

        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            paymentMethod: true,
            mpPaymentId: true,
            mpStatus: true,
            paidAt: true,
            confirmedAt: true,
            total: true,
            deliveryMethod: true,
            deliveryCost: true,
            subtotal: true,
            createdAt: true,
          },
        },
      },
    });

    if (!cs) {
      return NextResponse.json({ error: "No existe" }, { status: 404 });
    }

    // Si la sesión pertenece a un usuario registrado, verificar ownership.
    // Guest checkouts (userId === null) son accesibles con el ID solo (es un cuid aleatorio).
    if (cs.userId !== null) {
      const session = await getServerSession(authOptions);
      const sessionUserId = (session?.user as { id?: string } | undefined)?.id;

      if (!session || !sessionUserId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }

      if (sessionUserId !== cs.userId) {
        return NextResponse.json({ error: "Prohibido" }, { status: 403 });
      }
    }

    // Excluir userId del response — no es necesario en el cliente
    const { userId: _userId, ...csPublic } = cs;
    return NextResponse.json(csPublic);
  } catch (e) {
    console.error("GET checkoutSession error:", e);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}