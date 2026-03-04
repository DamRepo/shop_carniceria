import { sendEmail } from "../send";
import { welcomeTemplate } from "./welcome";
// luego agregaremos reset y compra

export async function sendWelcomeEmail(args: { to: string; name?: string }) {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("Falta APP_URL en .env");

  const { subject, html, text } = welcomeTemplate({
    name: args.name,
    appUrl,
  });

  await sendEmail({
    to: args.to,
    subject,
    html,
    text,
  });
}
