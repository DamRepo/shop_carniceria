function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function transferConfirmedTemplate(params: {
  customerName?: string;
  transferCode: string;
  totalText: string;
  deliveryMethod: "PICKUP" | "DELIVERY";
  pickupDate?: string | null;
  pickupTimeSlot?: string | null;
  address?: string | null;
}) {
  const name = params.customerName?.trim() || "Cliente";
  const subject = `✓ Pago confirmado — Pedido ${params.transferCode} | Carnicería El Negro`;

  const deliveryInfo =
    params.deliveryMethod === "PICKUP"
      ? `Retiro en local${params.pickupDate ? ` el ${params.pickupDate}` : ""}${params.pickupTimeSlot ? ` de ${params.pickupTimeSlot}` : ""}.`
      : `Envío a domicilio${params.address ? ` — ${params.address}` : ""}.`;

  const text = [
    `¡Hola ${name}!`,
    `Tu pago por ${params.totalText} fue confirmado. Tu pedido ${params.transferCode} está siendo preparado.`,
    ``,
    `Entrega: ${deliveryInfo}`,
    ``,
    `Gracias por elegir Carnicería El Negro.`,
  ].join("\n");

  const html = `
  <div style="font-family:Arial,sans-serif;background:#f4f4f4;padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table width="600" style="background:#fff;border-radius:10px;overflow:hidden;">

          <tr>
            <td style="padding:18px;text-align:center;border-bottom:1px solid #eee;">
              <div style="font-size:22px;font-weight:700;">Carnicería El Negro</div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px;text-align:center;">
              <div style="width:64px;height:64px;background:#d4edda;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
                <span style="font-size:32px;">✓</span>
              </div>
              <h2 style="margin:0 0 8px;color:#155724;">¡Pago confirmado!</h2>
              <p style="margin:0 0 20px;color:#555;">Tu transferencia fue verificada correctamente.</p>

              <div style="background:#f8f9fa;border-radius:8px;padding:14px;margin-bottom:16px;">
                <p style="margin:0 0 4px;color:#666;font-size:13px;">Código de pedido</p>
                <p style="margin:0;font-size:20px;font-weight:700;font-family:monospace;">${esc(params.transferCode)}</p>
              </div>

              <div style="background:#f8f9fa;border-radius:8px;padding:14px;margin-bottom:20px;">
                <p style="margin:0 0 4px;color:#666;font-size:13px;">Monto pagado</p>
                <p style="margin:0;font-size:20px;font-weight:700;color:#c40000;">${esc(params.totalText)}</p>
              </div>

              <div style="text-align:left;border:1px solid #dee2e6;border-radius:8px;padding:14px;">
                <p style="margin:0;font-size:13px;color:#555;"><strong>Entrega:</strong> ${esc(deliveryInfo)}</p>
              </div>

              <p style="margin-top:20px;color:#555;font-size:13px;">
                Gracias por elegir Carnicería El Negro. Si tenés alguna consulta, escribinos por WhatsApp.
              </p>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </div>`;

  return { subject, html, text };
}
