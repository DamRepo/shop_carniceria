import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { processMpPaymentById } from "@/lib/mp-payment-processor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type WebhookNotification = {
  topic: string | null;
  paymentId: string | null;
  rawBody: string | null;
  payload: any;
};

function jsonOk(data: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...data }, { status: 200 });
}

function parseJsonSafely(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readWebhookNotification(req: NextRequest): Promise<WebhookNotification> {
  const url = new URL(req.url);
  const sp = url.searchParams;

  let rawBody: string | null = null;
  let payload: any = null;

  rawBody = await req.text().catch(() => "");
  if (rawBody && rawBody.trim()) {
    payload = parseJsonSafely(rawBody);
  }

  const topicFromBody = payload?.type ?? payload?.topic ?? null;
  const paymentIdFromBody =
    payload?.data?.id != null
      ? String(payload.data.id)
      : payload?.id != null
      ? String(payload.id)
      : null;

  const topicFromQuery = sp.get("topic") || sp.get("type");
  const paymentIdFromQuery = sp.get("id") || sp.get("data.id");

  return {
    topic: topicFromBody ?? topicFromQuery ?? null,
    paymentId: paymentIdFromBody ?? paymentIdFromQuery ?? null,
    rawBody,
    payload,
  };
}

function extractSignatureParts(signatureHeader: string | null) {
  if (!signatureHeader) return null;

  const parts = signatureHeader.split(",");
  let ts: string | null = null;
  let v1: string | null = null;

  for (const part of parts) {
    const [rawKey, rawValue] = part.split("=");
    const key = rawKey?.trim();
    const value = rawValue?.trim();

    if (key === "ts") ts = value ?? null;
    if (key === "v1") v1 = value ?? null;
  }

  if (!ts || !v1) return null;
  return { ts, v1 };
}

function safeEqualHex(a: string, b: string) {
  const aBuf = Buffer.from(a.toLowerCase(), "hex");
  const bBuf = Buffer.from(b.toLowerCase(), "hex");

  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyMercadoPagoSignature(params: {
  secret: string;
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}) {
  const { secret, xSignature, xRequestId, dataId } = params;

  if (!secret || !xSignature || !xRequestId || !dataId) {
    return false;
  }

  const parsed = extractSignatureParts(xSignature);
  if (!parsed) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${parsed.ts};`;

  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  return safeEqualHex(expected, parsed.v1);
}

export async function POST(req: NextRequest) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Falta MERCADOPAGO_ACCESS_TOKEN" },
      { status: 500 }
    );
  }

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Falta MERCADOPAGO_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  const notification = await readWebhookNotification(req);

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  const isValidSignature = verifyMercadoPagoSignature({
    secret: webhookSecret,
    xSignature,
    xRequestId,
    dataId: notification.paymentId,
  });

  if (!isValidSignature) {
    console.warn("MP webhook firma inválida", {
      url: req.url,
      topic: notification.topic,
      paymentId: notification.paymentId,
      hasXSignature: Boolean(xSignature),
      hasXRequestId: Boolean(xRequestId),
    });

    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  console.log("MP webhook POST validado", {
    url: req.url,
    topic: notification.topic,
    paymentId: notification.paymentId,
    xRequestId,  // Loguear para detectar reintentos duplicados de MP en los logs
  });

  if (notification.topic !== "payment" || !notification.paymentId) {
    return jsonOk({
      ignored: true,
      reason: "unsupported_topic_or_missing_payment_id",
      topic: notification.topic,
      paymentId: notification.paymentId,
    });
  }

  const result = await processMpPaymentById(notification.paymentId, accessToken);
  return NextResponse.json(result, { status: 200 });
}