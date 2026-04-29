type SendTelegramMessageParams = {
  text: string;
  parseMode?: "HTML" | "MarkdownV2";
};

type TelegramResponse =
  | { ok: true; data: any }
  | { ok: false; error?: any; skipped?: boolean };

type TelegramOrderItem = {
  name: string;
  quantity: number;
  unitType: "PER_KG" | "PER_UNIT";
  lineTotalCents: number;
};

type BuildTelegramOrderMessageParams = {
  orderNumber: string | number;
  customerName: string;
  phone: string;
  email?: string | null;
  deliveryMethod: "PICKUP" | "DELIVERY";
  paymentMethod?: "CASH" | "BANK_TRANSFER" | "MERCADO_PAGO";

  address?: string | null;
  addressDetails?: string | null;

  notes?: string | null;

  pickupDate?: Date | string | null;
  pickupTimeSlot?: string | null;
  pickupNotes?: string | null;

  subtotalCents: number;
  deliveryCostCents?: number;
  totalCents: number;

  items?: TelegramOrderItem[];
};

function escapeTelegramHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeText(value?: string | null) {
  if (!value) return "";
  return escapeTelegramHtml(value.trim());
}

export function formatMoney(cents: number) {
  return `$${(cents / 100).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPickupDate(value?: Date | string | null) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("es-AR");
}

function formatItemQuantity(item: TelegramOrderItem) {
  if (item.unitType === "PER_KG") {
    return `${item.quantity} kg`;
  }

  return `${item.quantity} u`;
}

export async function sendTelegramMessage({
  text,
  parseMode = "HTML",
}: SendTelegramMessageParams): Promise<TelegramResponse> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn(
      "Telegram no configurado: falta TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID"
    );
    return { ok: false, skipped: true };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
          disable_web_page_preview: true,
        }),
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("Telegram API error:", data);
      return { ok: false, error: data };
    }

    return { ok: true, data };
  } catch (error) {
    console.error("Error enviando Telegram:", error);
    return { ok: false, error };
  }
}

/**
 * Construye el mensaje HTML para una orden.
 * No envía nada: solo arma el texto.
 */
export function buildTelegramOrderMessage(
  params: BuildTelegramOrderMessageParams
) {
  const customerName = safeText(params.customerName);
  const phone = safeText(params.phone);
  const email = safeText(params.email);
  const address = safeText(params.address);
  const addressDetails = safeText(params.addressDetails);
  const notes = safeText(params.notes);
  const pickupTimeSlot = safeText(params.pickupTimeSlot);
  const pickupNotes = safeText(params.pickupNotes);
  const pickupDate = formatPickupDate(params.pickupDate);

  const delivery =
    params.deliveryMethod === "DELIVERY"
      ? "🚚 Envío a domicilio"
      : "🏪 Retiro en local";

  const paymentLabel =
    params.paymentMethod === "BANK_TRANSFER"
      ? "🏦 Transferencia bancaria"
      : params.paymentMethod === "MERCADO_PAGO"
        ? "💳 Mercado Pago"
        : "💵 Efectivo";

  const itemsText =
    params.items && params.items.length > 0
      ? params.items
          .map((item) => {
            const name = safeText(item.name);
            const qty = formatItemQuantity(item);
            const total = formatMoney(item.lineTotalCents);

            return `• ${name} — ${qty} — ${total}`;
          })
          .join("\n")
      : "";

  return (
    `<b>🛒 Nueva compra</b>\n` +
    `<b>Pedido:</b> #${params.orderNumber}\n` +
    `<b>Cliente:</b> ${customerName}\n` +
    `<b>Teléfono:</b> ${phone}\n` +
    (email ? `<b>Email:</b> ${email}\n` : "") +
    `<b>Modalidad:</b> ${delivery}\n` +
    `<b>Pago:</b> ${paymentLabel}\n` +
    (address ? `<b>Dirección:</b> ${address}\n` : "") +
    (addressDetails ? `<b>Detalle dirección:</b> ${addressDetails}\n` : "") +
    (pickupDate ? `<b>Fecha retiro:</b> ${pickupDate}\n` : "") +
    (pickupTimeSlot ? `<b>Hora retiro:</b> ${pickupTimeSlot}\n` : "") +
    (pickupNotes ? `<b>Notas retiro:</b> ${pickupNotes}\n` : "") +
    (notes ? `<b>Notas cliente:</b> ${notes}\n` : "") +
    (itemsText ? `\n<b>Productos:</b>\n${itemsText}\n` : "") +
    `\n<b>Subtotal:</b> ${formatMoney(params.subtotalCents)}\n` +
    `<b>Envío:</b> ${formatMoney(params.deliveryCostCents ?? 0)}\n` +
    `<b>Total:</b> ${formatMoney(params.totalCents)}`
  );
}