import { TRANSFER_INFO } from "@/lib/transfer-info";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function transferInstructionsTemplate(params: {
  customerName?: string;
  transferCode: string;
  totalText: string;
  appUrl: string;
}) {
  const name = params.customerName?.trim() || "Cliente";
  const subject = `Instrucciones de transferencia | Carnicería El Negro`;

  const text = [
    `Hola ${name}!`,
    `Recibimos tu pedido. Para confirmarlo, realizá una transferencia por ${params.totalText} a esta cuenta:`,
    ``,
    `  Alias: ${TRANSFER_INFO.alias}`,
    `  CVU: ${TRANSFER_INFO.cvu}`,
    `  Titular: ${TRANSFER_INFO.name}`,
    ``,
    `Cualquier duda, escribinos por WhatsApp.`,
  ].join("\n");

  const html = `
  <div style="font-family:Arial,sans-serif;background:#f4f4f4;padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table width="600" style="background:#fff;border-radius:10px;overflow:hidden;">

          <tr>
            <td style="padding:18px;text-align:center;border-bottom:1px solid #eee;">
              <div style="font-size:22px;font-weight:700;">Carnicería El Negro</div>
              <div style="color:#777;margin-top:6px;">Pedido recibido — pendiente de pago</div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px;">
              <h2 style="margin:0 0 12px;color:#222;">¡Hola, ${esc(name)}!</h2>
              <p style="margin:0 0 20px;color:#555;">
                Recibimos tu pedido. Para confirmarlo, realizá una transferencia con los datos a continuación.
              </p>

              <!-- Monto -->
              <div style="background:#f8f9fa;border-radius:8px;padding:14px;margin-bottom:20px;text-align:center;">
                <p style="margin:0 0 4px;color:#666;font-size:13px;">Monto a transferir</p>
                <p style="margin:0;font-size:24px;font-weight:700;color:#c40000;">${esc(params.totalText)}</p>
              </div>

              <!-- Datos bancarios -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dee2e6;border-radius:8px;overflow:hidden;margin-bottom:20px;">
                <tr style="background:#f8f9fa;">
                  <td colspan="2" style="padding:12px 16px;font-weight:700;font-size:14px;border-bottom:1px solid #dee2e6;">
                    Datos para la transferencia
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;color:#666;font-size:13px;width:35%;border-bottom:1px solid #f0f0f0;">Alias</td>
                  <td style="padding:10px 16px;font-weight:600;font-family:monospace;border-bottom:1px solid #f0f0f0;">${esc(TRANSFER_INFO.alias)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;color:#666;font-size:13px;border-bottom:1px solid #f0f0f0;">CVU</td>
                  <td style="padding:10px 16px;font-weight:600;font-family:monospace;font-size:12px;border-bottom:1px solid #f0f0f0;">${esc(TRANSFER_INFO.cvu)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;color:#666;font-size:13px;">Titular</td>
                  <td style="padding:10px 16px;font-weight:600;">${esc(TRANSFER_INFO.name)}</td>
                </tr>
              </table>

              <p style="color:#555;font-size:13px;margin:0;">
                Cualquier duda, escribinos por WhatsApp.
              </p>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </div>`;

  return { subject, html, text };
}
