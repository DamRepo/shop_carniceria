import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadTransferProof } from "@/lib/uploads/upload-proof";
import { sendTelegramMessage } from "@/lib/telegram";
import { formatTransferAmount } from "@/lib/transfer-code";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function escHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const rl = rateLimit(`transfer-proof:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intentá de nuevo en unos minutos." },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions).catch(() => null);
    const sessionUserId = (session?.user as any)?.id as string | undefined;
    const sessionEmail = session?.user?.email?.toLowerCase();
    const sessionRole = (session?.user as any)?.role as string | undefined;

    if (!sessionUserId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const orderId = params.id;

    if (!orderId) {
      return NextResponse.json({ error: "Falta id de orden" }, { status: 400 });
    }

    const order = await (prisma.order.findUnique as any)({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        email: true,
        paymentMethod: true,
        transferCode: true,
        transferStatus: true,
        customerName: true,
        phone: true,
        total: true,
        orderNumber: true,
      },
    }) as any;

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    const isAdmin = sessionRole === "ADMIN";
    const isOwnerById = order.userId && order.userId === sessionUserId;
    const isOwnerByEmail =
      !order.userId &&
      !!order.email &&
      !!sessionEmail &&
      order.email.toLowerCase() === sessionEmail;

    if (!isAdmin && !isOwnerById && !isOwnerByEmail) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (order.paymentMethod !== "BANK_TRANSFER") {
      return NextResponse.json(
        { error: "Esta orden no es por transferencia" },
        { status: 400 }
      );
    }

    if (order.transferStatus === "CONFIRMED") {
      return NextResponse.json(
        { error: "Esta orden ya fue confirmada" },
        { status: 400 }
      );
    }

    let proofUrl: string | null = null;
    let proofMimeType: string | null = null;

    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("proof");

      if (file && file instanceof File && file.size > 0) {
        proofMimeType = file.type || null;
        proofUrl = await uploadTransferProof(file, order.transferCode ?? orderId);
      }
    }

    await (prisma.order.update as any)({
      where: { id: orderId },
      data: {
        transferStatus: "PENDING_REVIEW",
        ...(proofUrl && { transferProofUrl: proofUrl }),
        ...(proofUrl && proofMimeType && { transferProofMimeType: proofMimeType }),
      },
    });

    const code = escHtml(order.transferCode ?? order.orderNumber);
    const customerName = escHtml(order.customerName);
    const phone = escHtml(order.phone);
    const amount = escHtml(formatTransferAmount(order.total));

    const adminMsg =
      `<b>🏦 Nueva transferencia pendiente</b>\n` +
      `<b>Código:</b> <code>${code}</code>\n` +
      `<b>Cliente:</b> ${customerName}\n` +
      `<b>Tel:</b> ${phone}\n` +
      `<b>Monto:</b> ${amount}\n` +
      (proofUrl
        ? `<b>Comprobante:</b> ${escHtml(proofUrl)}`
        : `Sin comprobante adjunto`);

    sendTelegramMessage({ text: adminMsg }).catch((e) =>
      console.error("Telegram proof notify error:", e)
    );

    return NextResponse.json({ ok: true, proofUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error inesperado";
    console.error("transfer-proof error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
