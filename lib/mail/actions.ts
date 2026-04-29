import "server-only";
import { sendEmail } from "./send";
import { welcomeTemplate } from "./templates/welcome";
import { resetPasswordTemplate } from "./templates/resetPassword";
import { orderConfirmationTemplate } from "./templates/orderConfirmation";
import { transferInstructionsTemplate } from "./templates/transferInstructions";
import { transferConfirmedTemplate } from "./templates/transferConfirmed";
import { transferRejectedTemplate } from "./templates/transferRejected";

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

export async function sendTransferInstructionsEmail(args: {
  to: string;
  customerName?: string;
  transferCode: string;
  totalText: string;
}) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const { subject, html, text } = transferInstructionsTemplate({
    customerName: args.customerName,
    transferCode: args.transferCode,
    totalText: args.totalText,
    appUrl,
  });
  await sendEmail({ to: args.to, subject, html, text });
}

export async function sendTransferConfirmedEmail(args: {
  to: string;
  customerName?: string;
  transferCode: string;
  totalText: string;
  deliveryMethod: "PICKUP" | "DELIVERY";
  pickupDate?: string | null;
  pickupTimeSlot?: string | null;
  address?: string | null;
}) {
  const { subject, html, text } = transferConfirmedTemplate(args);
  await sendEmail({ to: args.to, subject, html, text });
}

export async function sendTransferRejectedEmail(args: {
  to: string;
  customerName?: string;
  transferCode: string;
  totalText: string;
  rejectNote: string;
}) {
  const { subject, html, text } = transferRejectedTemplate(args);
  await sendEmail({ to: args.to, subject, html, text });
}