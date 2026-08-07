import { Resend } from "resend";
import { NewInvoiceEmail, PaymentRequestEmail } from "./templates/new-invoice";
import { DueSoonEmail } from "./templates/due-soon";
import { OverdueEmail } from "./templates/overdue";
import { ReceiptEmail } from "./templates/receipt";
import { PriceChangeEmail } from "./templates/price-change";
import { SubscriptionCancelledEmail } from "./templates/subscription-cancelled";

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

function getFrom() {
  return process.env.RESEND_FROM_EMAIL || "Billing <onboarding@resend.dev>";
}

interface InvoiceEmailInput {
  to: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  payUrl: string;
  serviceName?: string;
  note?: string;
}

export async function sendNewInvoiceEmail(input: InvoiceEmailInput) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set - skipping new invoice email");
    return { error: "Email not configured" };
  }
  const { error } = await resend.emails.send({
    from: getFrom(),
    to: input.to,
    subject: `New invoice ${input.invoiceNumber} - ${input.amount}`,
    react: NewInvoiceEmail(input),
  });
  return { error: error?.message ?? null };
}

export async function sendDueSoonEmail(input: InvoiceEmailInput) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set - skipping due-soon email");
    return { error: "Email not configured" };
  }
  const { error } = await resend.emails.send({
    from: getFrom(),
    to: input.to,
    subject: `Payment reminder: invoice ${input.invoiceNumber} due ${input.dueDate}`,
    react: DueSoonEmail(input),
  });
  return { error: error?.message ?? null };
}

export async function sendOverdueEmail(input: InvoiceEmailInput) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set - skipping overdue email");
    return { error: "Email not configured" };
  }
  const { error } = await resend.emails.send({
    from: getFrom(),
    to: input.to,
    subject: `Overdue: invoice ${input.invoiceNumber}`,
    react: OverdueEmail(input),
  });
  return { error: error?.message ?? null };
}

/** Sent by hand from the dashboard, rather than by the daily job. */
export async function sendPaymentRequestEmail(input: InvoiceEmailInput) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set - skipping payment request email");
    return { error: "Email not configured" };
  }
  const { error } = await resend.emails.send({
    from: getFrom(),
    to: input.to,
    subject: `Payment request: ${input.amount} - invoice ${input.invoiceNumber}`,
    react: PaymentRequestEmail(input),
  });
  return { error: error?.message ?? null };
}

export async function sendPriceChangeEmail(input: {
  to: string;
  clientName: string;
  planName: string;
  oldAmount: string;
  newAmount: string;
  manageUrl: string;
  effectiveFrom?: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set - skipping price change email");
    return { error: "Email not configured" };
  }
  const { error } = await resend.emails.send({
    from: getFrom(),
    to: input.to,
    subject: `Your ${input.planName} subscription price is changing`,
    react: PriceChangeEmail(input),
  });
  return { error: error?.message ?? null };
}

export async function sendSubscriptionCancelledEmail(input: {
  to: string;
  clientName: string;
  planName: string;
  lastBillingDate?: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set - skipping cancellation email");
    return { error: "Email not configured" };
  }
  const { error } = await resend.emails.send({
    from: getFrom(),
    to: input.to,
    subject: `Your ${input.planName} subscription has been cancelled`,
    react: SubscriptionCancelledEmail(input),
  });
  return { error: error?.message ?? null };
}

export async function sendReceiptEmail(input: {
  to: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  paidAt: string;
  gateway: string;
  manageUrl?: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set - skipping receipt email");
    return { error: "Email not configured" };
  }
  const { error } = await resend.emails.send({
    from: getFrom(),
    to: input.to,
    subject: `Payment received - invoice ${input.invoiceNumber}`,
    react: ReceiptEmail(input),
  });
  return { error: error?.message ?? null };
}
