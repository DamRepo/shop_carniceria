import { TRANSFER_INFO } from "@/lib/transfer-info";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function transferRejectedTemplate(params: {
  customerName?: string;
  transferCode: string;
  totalText: string;
  rejectNote: string;
}) {
  const name = params.customerName?.trim() || "Cliente";
  const subject = `⚠ Verificación de pago — Pedido ${params.transferCode} | Carnicería El Negro`;

  const text = [
    `Hola ${name}.`,
    `No pudimos verificar el pago de tu pedido ${params.transferCode}.`,
    ``,
    `Motivo: ${params.rejectNote}`,
    ``,
    `Si ya realizaste la transferencia, por favor contactanos por WhatsApp.`,
    `Si necesitás volver a transferir, los datos son:`,
    `  Alias: ${TRANSFER_INFO.alias}`,
    `  CVU: ${TRANSFER_INFO.cvu}`,
    `  Titular: ${TRANSFER_INFO.name}`,
    `  Monto: ${params.totalText}`,
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
            <td style="padding:24px;">
              <h2 style="margin:0 0 12px;color:#721c24;">⚠ No pudimos verificar tu pago</h2>
              <p style="margin:0 0 16px;color:#555;">
                Hola <strong>${esc(name)}</strong>, revisamos la transferencia para el pedido
                <strong style="font-family:monospace;">${esc(params.transferCode)}</strong>
                (${esc(params.totalText)}) y encontramos un problema.
              </p>

              <div style="background:#f8d7da;border:1px solid #f5c6cb;border-radius:8px;padding:14px;margin-bottom:20px;">
                <p style="margin:0;font-size:13px;color:#721c24;">
                  <strong>Motivo:</strong> ${esc(params.rejectNote)}
                </p>
              </div>

              <p style="color:#555;font-size:13px;margin:0 0 12px;">
                Si ya realizaste la transferencia o necesitás ayuda, contactanos por WhatsApp y te guiamos.
              </p>

              <p style="color:#555;font-size:13px;margin:0 0 8px;">Si necesitás volver a transferir:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dee2e6;border-radius:8px;overflow:hidden;font-size:13px;">
                <tr><td style="padding:8px 14px;background:#f8f9fa;color:#666;">Alias</td><td style="padding:8px 14px;font-family:monospace;font-weight:600;">${esc(TRANSFER_INFO.alias)}</td></tr>
                <tr><td style="padding:8px 14px;background:#f8f9fa;color:#666;border-top:1px solid #f0f0f0;">CVU</td><td style="padding:8px 14px;font-family:monospace;font-size:11px;font-weight:600;border-top:1px solid #f0f0f0;">${esc(TRANSFER_INFO.cvu)}</td></tr>
                <tr><td style="padding:8px 14px;background:#f8f9fa;color:#666;border-top:1px solid #f0f0f0;">Monto</td><td style="padding:8px 14px;font-weight:700;border-top:1px solid #f0f0f0;">${esc(params.totalText)}</td></tr>
              </table>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </div>`;

  return { subject, html, text };
}
