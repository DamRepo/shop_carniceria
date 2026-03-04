import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED: Record<string, true> = {
  PENDING: true,
  CONFIRMED: true,
  PREPARING: true,
  READY: true,
  COMPLETED: true,
  CANCELLED: true,
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const status = body?.status as string | undefined;

    if (!status || !ALLOWED[status]) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    // Traemos el estado actual para decidir confirmedAt
    const current = await prisma.order.findUnique({
      where: { id: params.id },
      select: { confirmedAt: true, status: true },
    });

    if (!current) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    const shouldConfirm =
      status === "CONFIRMED" ||
      status === "PREPARING" ||
      status === "READY" ||
      status === "COMPLETED";

    const data: any = { status };

    // ✅ Si pasa a estado “real” y no estaba confirmada, la confirmamos ahora
    if (shouldConfirm && !current.confirmedAt) {
      data.confirmedAt = new Date();
    }

    // Si cancelás, no tocamos confirmedAt (podés decidir lo contrario)
    const order = await prisma.order.update({
      where: { id: params.id },
      data,
      include: {
        items: { include: { product: true } },
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Error al actualizar orden" }, { status: 500 });
  }
}
