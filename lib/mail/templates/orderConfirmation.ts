import { formatPrice } from "@/lib/utils-format";

type OrderItemEmail = {
  name: string;
  quantity: number;
  unitPrice: number; // centavos
};

export function orderConfirmationTemplate(params: {
  customerName?: string;
  orderId: string;
  items: OrderItemEmail[];
  totalText: string; // formatPrice, por ejemplo "$ 12.500"
  discountText?: string; // por ejemplo "-$ 1.250"; se omite si no hay descuento
  pointsUsed?: number; // puntos canjeados; se omite si no hubo canje
  pointsDiscountText?: string; // por ejemplo "-$ 500"; se omite si no hubo canje
  pointsToEarn?: number; // puntos que gana al confirmarse el pago; se omite si es 0
  appUrl: string;
}) {
  const name = params.customerName?.trim() || "👋";
  const hasPointsDiscount = Boolean(params.pointsDiscountText);
  const pointsToEarn = params.pointsToEarn ?? 0;
  const pointsUsedLabel = `Puntos usados (${params.pointsUsed ?? 0})`;
  const earnLabel = `Ganás ${pointsToEarn} ${pointsToEarn === 1 ? "punto" : "puntos"} cuando se confirme tu pago.`;

  const rows = params.items.map((it) => `
    <tr>
      <td style="padding:10px; border-bottom:1px solid #eee;">${escapeHtml(it.name)}</td>
      <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${it.quantity}</td>
      <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">${escapeHtml(formatPrice(it.unitPrice))}</td>
    </tr>
  `).join("");

  const subject = `Confirmación de compra - Pedido ${params.orderId}`;
  const discountLine = params.discountText
    ? ` Descuento de bienvenida (10%): ${params.discountText}.`
    : "";
  const pointsLine = hasPointsDiscount ? ` ${pointsUsedLabel}: ${params.pointsDiscountText}.` : "";
  const earnLine = pointsToEarn > 0 ? ` ${earnLabel}` : "";
  const text = `Hola ${name}. Tu compra fue confirmada. Pedido: ${params.orderId}.${discountLine}${pointsLine} Total: ${params.totalText}${earnLine}`;

  const html = `
  <div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table width="600" style="background:#fff; border-radius:10px; overflow:hidden;">
          <tr>
            <td style="padding:18px; text-align:center; border-bottom:1px solid #eee;">
              <div style="font-size:22px; font-weight:700;">Carnicería El Negro</div>
              <div style="color:#777; margin-top:6px;">Confirmación de compra</div>
            </td>
          </tr>

          <tr>
            <td style="padding:22px;">
              <h2 style="margin:0 0 10px; color:#222;">Gracias ${escapeHtml(name)} 🙌</h2>
              <p style="margin:0 0 14px; color:#555;">Tu pedido <b>${escapeHtml(params.orderId)}</b> fue registrado.</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee; border-radius:8px; overflow:hidden;">
                <tr style="background:#fafafa;">
                  <th style="padding:10px; text-align:left;">Producto</th>
                  <th style="padding:10px; text-align:center;">Cant.</th>
                  <th style="padding:10px; text-align:right;">Precio</th>
                </tr>
                ${rows}
              </table>
              ${params.discountText ? `
              <div style="margin-top:14px; text-align:right; font-size:14px; color:#2e7d32;">
                Descuento de bienvenida (10%): ${escapeHtml(params.discountText)}
              </div>` : ""}${hasPointsDiscount ? `
              <div style="margin-top:${params.discountText ? "6px" : "14px"}; text-align:right; font-size:14px; color:#2e7d32;">
                ${escapeHtml(pointsUsedLabel)}: ${escapeHtml(params.pointsDiscountText ?? "")}
              </div>` : ""}

              <div style="margin-top:${params.discountText || hasPointsDiscount ? "6px" : "14px"}; text-align:right; font-size:16px;">
                <b>Total: ${escapeHtml(params.totalText)}</b>
              </div>${pointsToEarn > 0 ? `
              <div style="margin-top:10px; text-align:right; font-size:14px; color:#2e7d32;">
                ${escapeHtml(earnLabel)}
              </div>` : ""}

              <div style="margin-top:18px; text-align:center;">
                <a href="${params.appUrl}"
                  style="display:inline-block; background:#c40000; color:#fff; text-decoration:none; padding:12px 18px; border-radius:6px;">
                  Ver la tienda
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </div>`;

  return { subject, html, text };
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
