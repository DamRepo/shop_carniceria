export function resetPasswordTemplate(args: {
  name?: string;
  resetUrl: string;
  appUrl: string;
}) {
  const name = args.name?.trim() || "Hola";
  const subject = "Restablecer contraseña";

  const text =
    `${name},\n\n` +
    `Recibimos un pedido para restablecer tu contraseña.\n` +
    `Abrí este enlace:\n${args.resetUrl}\n\n` +
    `Si no fuiste vos, ignorá este email.\n\n` +
    `${args.appUrl}`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2>Restablecer contraseña</h2>
      <p>${name},</p>
      <p>Recibimos un pedido para restablecer tu contraseña.</p>
      <p>
        <a href="${args.resetUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;text-decoration:none">
          Cambiar contraseña
        </a>
      </p>
      <p style="font-size:12px;opacity:.8">
        Si no fuiste vos, ignorá este email.
      </p>
      <p style="font-size:12px;opacity:.8">${args.appUrl}</p>
    </div>
  `.trim();

  return { subject, html, text };
}
