export function welcomeTemplate(params: { name?: string; appUrl: string }) {
  const name = (params.name?.trim() || "👋");
  const subject = "¡Bienvenido a Carnicería El Negro!";
  const text = `Hola ${name}. Gracias por registrarte.`;

  const html = `
  <div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table width="600" style="background:#fff; border-radius:10px; overflow:hidden;">
          <tr>
            <td style="padding:18px; text-align:center; border-bottom:1px solid #eee;">
              <div style="font-size:22px; font-weight:700;">Carnicería El Negro</div>
              <div style="color:#777; margin-top:6px;">Mega ofertas y calidad</div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px;">
              <h2 style="margin:0 0 10px; color:#222;">Hola ${escapeHtml(name)}</h2>
              <p style="margin:0; color:#555; line-height:1.5;">
                Gracias por registrarte. Ya podés comprar y recibir novedades.
              </p>
              <div style="margin-top:18px; text-align:center;">
                <a href="${params.appUrl}"
                  style="display:inline-block; background:#c40000; color:#fff; text-decoration:none; padding:12px 18px; border-radius:6px;">
                  Ir a la tienda
                </a>
              </div>
              <p style="margin:18px 0 0; color:#888; font-size:12px;">
                Si no fuiste vos, podés ignorar este email.
              </p>
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
