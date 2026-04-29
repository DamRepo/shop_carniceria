import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { orderId: string } }
) {
  const session = await getServerSession(authOptions).catch(() => null);
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user || role !== "ADMIN") {
    return new NextResponse("No autorizado", { status: 403 });
  }

  const order = await (prisma.order.findUnique as any)({
    where: { id: params.orderId },
    select: { transferProofUrl: true },
  }) as { transferProofUrl: string | null } | null;

  if (!order?.transferProofUrl) {
    return new NextResponse("Comprobante no encontrado", { status: 404 });
  }

  return NextResponse.redirect(order.transferProofUrl);
}
