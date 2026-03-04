import "server-only";
import { sendEmail } from "./send";
import { welcomeTemplate } from "./templates/welcome";
import { resetPasswordTemplate } from "./templates/resetPassword";
import { orderConfirmationTemplate } from "./templates/orderConfirmation";

export async function sendWelcomeEmail(args: { to: string; name?: string }) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const { subject, html, text } = welcomeTemplate({ name: args.name, appUrl });
  await sendEmail({ to: args.to, subject, html, text });
}

export async function sendResetPasswordEmail(args: {
  to: string;
  name?: string;
  resetUrl: string;
}) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const { subject, html, text } = resetPasswordTemplate({
    name: args.name,
    appUrl,
    resetUrl: args.resetUrl,
  });
  await sendEmail({ to: args.to, subject, html, text });
}

export async function sendOrderConfirmationEmail(args: {
  to: string;
  customerName?: string;
  orderId: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  totalText: string;
}) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const { subject, html, text } = orderConfirmationTemplate({
    customerName: args.customerName,
    orderId: args.orderId,
    items: args.items,
    totalText: args.totalText,
    appUrl,
  });

  await sendEmail({ to: args.to, subject, html, text });
}