type OrderItemEmail = {
  name: string;
  quantity: number;
  unitPrice: number; // en centavos o número normal, según tu sistema
};

export function orderConfirmationTemplate(params: {
  customerName?: string;
  orderId: string;
  items: OrderItemEmail[];
  totalText: string; // por ejemplo "$12.500"
  appUrl: string;
}) {
  const name = params.customerName?.trim() || "👋";

  const rows = params.items.map((it) => `
    <tr>
      <td style="padding:10px; border-bottom:1px solid #eee;">${escapeHtml(it.name)}</td>
      <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${it.quantity}</td>
      <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">${formatMoney(it.unitPrice)}</td>
    </tr>
  `).join("");

  const subject = `Confirmación de compra - Pedido ${params.orderId}`;
  const text = `Hola ${name}. Tu compra fue confirmada. Pedido: ${params.orderId}. Total: ${params.totalText}`;

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

              <div style="margin-top:14px; text-align:right; font-size:16px;">
                <b>Total: ${escapeHtml(params.totalText)}</b>
              </div>

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


// AJUSTAR: si tu sistema usa centavos, convertís acá
function formatMoney(value: number) {
  // placeholder simple
  return `$${value}`;
}
