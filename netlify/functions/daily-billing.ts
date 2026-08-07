import type { Config } from "@netlify/functions";
import { addMonths, addYears, format } from "date-fns";
import { createAdminClient } from "../../lib/supabase/admin";
import {
  sendNewInvoiceEmail,
  sendDueSoonEmail,
  sendOverdueEmail,
} from "../../lib/email/send";
import { formatCurrency, formatDate } from "../../lib/format";
import { getInvoicePayUrl } from "../../lib/urls";
import type { SubscriptionFrequency } from "../../types/database";

const DATE_FORMAT = "yyyy-MM-dd";

function advanceDueDate(dueDate: string, frequency: SubscriptionFrequency): string {
  const parsed = new Date(`${dueDate}T00:00:00Z`);
  const next =
    frequency === "yearly"
      ? addYears(parsed, 1)
      : addMonths(parsed, frequency === "quarterly" ? 3 : 1);
  return format(next, DATE_FORMAT);
}

const dailyBilling = async () => {
  const supabase = createAdminClient();
  const today = format(new Date(), DATE_FORMAT);
  const dueSoonDate = format(addDaysUtc(new Date(), 3), DATE_FORMAT);

  const results = {
    invoicesCreated: 0,
    dueSoonReminders: 0,
    overdueMarked: 0,
    errors: [] as string[],
  };

  // 1. Generate invoices for subscriptions hitting their next_due_date today.
  const { data: dueSubscriptions, error: subsError } = await supabase
    .from("subscriptions")
    .select("*, clients(id, name, email, phone)")
    .eq("status", "active")
    .eq("next_due_date", today);

  if (subsError) results.errors.push(`subscriptions: ${subsError.message}`);

  for (const sub of dueSubscriptions ?? []) {
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        subscription_id: sub.id,
        client_id: sub.client_id,
        amount: sub.amount,
        invoice_date: today,
        due_date: sub.next_due_date,
      })
      .select("id, invoice_number, amount, due_date")
      .single();

    if (invoiceError || !invoice) {
      results.errors.push(
        `invoice for subscription ${sub.id}: ${invoiceError?.message}`,
      );
      continue;
    }

    const { error: advanceError } = await supabase
      .from("subscriptions")
      .update({ next_due_date: advanceDueDate(sub.next_due_date, sub.frequency) })
      .eq("id", sub.id);

    if (advanceError) {
      results.errors.push(`advance subscription ${sub.id}: ${advanceError.message}`);
    }

    results.invoicesCreated += 1;

    const client = sub.clients;
    if (client?.email) {
      const { error: emailError } = await sendNewInvoiceEmail({
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
        status: emailError ? "failed" : "sent",
        sent_at: new Date().toISOString(),
      });
    }
  }

  // 2. Send "due soon" reminders for invoices due in 3 days.
  const { data: dueSoonInvoices, error: dueSoonError } = await supabase
    .from("invoices")
    .select("*, clients(id, name, email, phone)")
    .eq("status", "pending")
    .eq("due_date", dueSoonDate);

  if (dueSoonError) results.errors.push(`due-soon query: ${dueSoonError.message}`);

  for (const invoice of dueSoonInvoices ?? []) {
    const client = invoice.clients;
    if (!client?.email) continue;

    const { error: emailError } = await sendDueSoonEmail({
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
      status: emailError ? "failed" : "sent",
      sent_at: new Date().toISOString(),
    });
    results.dueSoonReminders += 1;
  }

  // 3. Flag overdue invoices (due date passed, still pending) and notify.
  const { data: overdueInvoices, error: overdueError } = await supabase
    .from("invoices")
    .select("*, clients(id, name, email, phone)")
    .eq("status", "pending")
    .lt("due_date", today);

  if (overdueError) results.errors.push(`overdue query: ${overdueError.message}`);

  for (const invoice of overdueInvoices ?? []) {
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ status: "overdue" })
      .eq("id", invoice.id);

    if (updateError) {
      results.errors.push(`mark overdue ${invoice.id}: ${updateError.message}`);
      continue;
    }
    results.overdueMarked += 1;

    const client = invoice.clients;
    if (!client?.email) continue;

    const { error: emailError } = await sendOverdueEmail({
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
      status: emailError ? "failed" : "sent",
      sent_at: new Date().toISOString(),
    });
  }

  console.log("daily-billing run complete", results);

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
};

function addDaysUtc(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export default dailyBilling;

export const config: Config = {
  schedule: "0 4 * * *",
};
