import "server-only";
import { resend } from "./resend";

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailArgs) {
  const from = process.env.MAIL_FROM;
  if (!from) throw new Error("Falta MAIL_FROM en .env");

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });

  if (error) throw new Error(error.message);
  return data;
}
