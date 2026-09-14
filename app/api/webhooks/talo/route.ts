import { NextRequest, NextResponse } from "next/server";
import { processTaloPayment } from "@/lib/talo-payment-processor";
import { debeProcesarWebhookTalo } from "@/lib/rate-limit-talo-webhook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TaloWebhookNotification = {
  message?: string;
  paymentId?: string;
  externalId?: string;
};

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ ok: true, ignored: "invalid_content_type" }, { status: 200 });
  }

  const rawBody = await req.text().catch(() => "");
  let notification: TaloWebhookNotification | null = null;

  try {
    notification = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    notification = null;
  }

  console.log("[talo webhook] Notificación recibida", {
    message: notification?.message,
    paymentId: notification?.paymentId,
    externalId: notification?.externalId,
  });

  const paymentId = notification?.paymentId;

  if (!paymentId) {
    // No confiamos en nada del payload salvo el ID a re-consultar; sin ID no hay nada que hacer.
    return NextResponse.json({ ok: true, ignored: "missing_payment_id" }, { status: 200 });
  }

  if (!debeProcesarWebhookTalo(paymentId)) {
    console.warn("[talo webhook] Rate limit alcanzado", { paymentId });
    return NextResponse.json({ ok: true, ignored: "rate_limited" }, { status: 200 });
  }

  // Talo espera una respuesta <3s: la confirmación real (processTaloPayment, en
  // lib/talo-payment-processor.ts) se procesa desacoplada, sin bloquear esta
  // respuesta — el proceso Node.js sigue vivo en el standalone del VPS.
  // Si el proceso muere antes de terminar, scripts/reconcile-talo-payments.ts
  // corrige esos casos corriendo la misma función más tarde.
  processTaloPayment(paymentId).catch((err) => {
    console.error("[talo webhook] Error no controlado procesando el pago:", err, { paymentId });
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
