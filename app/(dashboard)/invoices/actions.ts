"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invoiceSchema } from "@/lib/validations/invoice";
import { paymentSchema } from "@/lib/validations/payment";
import { formatCurrency, formatDate } from "@/lib/format";
import { getInvoicePayUrl } from "@/lib/urls";
import { sendNewInvoiceEmail, sendReceiptEmail } from "@/lib/email/send";

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
