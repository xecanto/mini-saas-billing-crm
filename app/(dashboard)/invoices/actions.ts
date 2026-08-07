"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invoiceSchema, oneTimeChargeSchema } from "@/lib/validations/invoice";
import { paymentSchema } from "@/lib/validations/payment";
import { formatCurrency, formatDate } from "@/lib/format";
import { getInvoicePayUrl } from "@/lib/urls";
import {
  sendNewInvoiceEmail,
  sendPaymentRequestEmail,
  sendReceiptEmail,
} from "@/lib/email/send";

/**
 * Bills a client once, outside any subscription: setup fees, extra work, or a
 * one-time plan bought off the catalogue.
 *
 * It produces an ordinary invoice - one-off and recurring charges settle
 * through exactly the same pay page, webhook and receipt - and optionally
 * emails the payment request straight away.
 */
export async function createOneTimeCharge(values: {
  client_id: string;
  plan_id?: string | null;
  description: string;
  amount: number;
  due_date: string;
  send_email: boolean;
}) {
  const parsed = oneTimeChargeSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  const supabase = await createClient();
  const data = parsed.data;

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      client_id: data.client_id,
      plan_id: data.plan_id || null,
      amount: data.amount,
      due_date: data.due_date,
      notes: data.description,
    })
    .select("id, invoice_number")
    .single();

  if (error || !invoice) return { error: error?.message ?? "Could not create the invoice." };

  revalidatePath("/invoices");
  revalidatePath(`/clients/${data.client_id}`);

  if (data.send_email) {
    const result = await sendInvoicePaymentRequest(invoice.id, data.description);
    if (result.error) {
      // The charge exists; only the email failed. Say so rather than implying
      // nothing happened.
      return {
        error: null,
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        emailWarning: result.error,
      };
    }
  }

  return { error: null, id: invoice.id, invoiceNumber: invoice.invoice_number };
}

export async function createInvoiceRecord(values: unknown) {
  const parsed = invoiceSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  const supabase = await createClient();
  const { subscription_id, ...rest } = parsed.data;

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      ...rest,
      subscription_id: subscription_id || null,
    })
    .select("id, invoice_number, amount, due_date, client_id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/invoices");
  revalidatePath(`/clients/${parsed.data.client_id}`);

  const { data: client } = await supabase
    .from("clients")
    .select("name, email")
    .eq("id", invoice.client_id)
    .single();

  if (client?.email) {
    await sendNewInvoiceEmail({
      to: client.email,
      clientName: client.name,
      invoiceNumber: invoice.invoice_number,
      amount: formatCurrency(invoice.amount),
      dueDate: formatDate(invoice.due_date),
      payUrl: getInvoicePayUrl(invoice.id),
    });
    await supabase.from("reminders").insert({
      invoice_id: invoice.id,
      channel: "email",
      status: "sent",
      sent_at: new Date().toISOString(),
    });
  }

  return { error: null, id: invoice.id as string };
}

export async function markInvoicePaid(invoiceId: string, values: unknown) {
  const parsed = paymentSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  const supabase = await createClient();

  const { error: paymentError } = await supabase
    .from("payments")
    .insert(parsed.data);
  if (paymentError) return { error: paymentError.message };

  const { data: invoice, error: updateError } = await supabase
    .from("invoices")
    .update({ status: "paid" })
    .eq("id", invoiceId)
    .select("id, invoice_number, amount, client_id")
    .single();

  if (updateError) return { error: updateError.message };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/payments`);
  revalidatePath(`/clients/${invoice.client_id}`);

  const { data: client } = await supabase
    .from("clients")
    .select("name, email")
    .eq("id", invoice.client_id)
    .single();

  if (client?.email) {
    await sendReceiptEmail({
      to: client.email,
      clientName: client.name,
      invoiceNumber: invoice.invoice_number,
      amount: formatCurrency(parsed.data.amount),
      paidAt: formatDate(parsed.data.paid_at),
      gateway: parsed.data.gateway.replace("_", " "),
    });
  }

  return { error: null };
}

/**
 * Emails the client a payment link for an invoice, on demand.
 *
 * Separate from the daily job's automatic reminders so you can chase a specific
 * invoice without waiting for the schedule, with an optional personal note.
 * Logged as a reminder so the invoice history shows it was sent.
 */
export async function sendInvoicePaymentRequest(
  invoiceId: string,
  note?: string,
) {
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, amount, due_date, status, clients(name, email), plans(name, services(name))",
    )
    .eq("id", invoiceId)
    .single();

  if (error || !invoice) return { error: "Invoice not found." };

  if (invoice.status === "paid") {
    return { error: "This invoice is already paid." };
  }
  if (invoice.status === "cancelled") {
    return { error: "This invoice has been cancelled." };
  }

  const client = invoice.clients as { name: string; email: string | null } | null;
  if (!client?.email) {
    return { error: "This client has no email address on file." };
  }

  const plan = invoice.plans as
    | { name: string; services: { name: string } | null }
    | null;
  const serviceName = plan
    ? [plan.services?.name, plan.name].filter(Boolean).join(" — ")
    : undefined;

  const { error: emailError } = await sendPaymentRequestEmail({
    to: client.email,
    clientName: client.name,
    invoiceNumber: invoice.invoice_number,
    amount: formatCurrency(invoice.amount),
    dueDate: formatDate(invoice.due_date),
    payUrl: getInvoicePayUrl(invoice.id),
    serviceName,
    note: note?.trim() || undefined,
  });

  if (emailError) return { error: `Email failed: ${emailError}` };

  await supabase.from("reminders").insert({
    invoice_id: invoice.id,
    channel: "email",
    status: "sent",
    sent_at: new Date().toISOString(),
  });

  revalidatePath(`/invoices/${invoiceId}`);
  return { error: null, sentTo: client.email };
}

export async function logWhatsAppReminder(invoiceId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("reminders").insert({
    invoice_id: invoiceId,
    channel: "whatsapp",
    status: "sent",
    sent_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  revalidatePath(`/invoices/${invoiceId}`);
  return { error: null };
}

export async function cancelInvoiceRecord(id: string, clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath(`/clients/${clientId}`);
  return { error: null };
}

export async function deleteInvoiceRecord(id: string, clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/invoices");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/payments");
  return { error: null };
}
