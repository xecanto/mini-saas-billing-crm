import "server-only";
import { format } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReceiptEmail } from "@/lib/email/send";
import { formatCurrency, formatDate } from "@/lib/format";
import { advanceDueDate, DATE_FORMAT } from "@/lib/billing";

/**
 * Handles subscription.* webhooks.
 *
 * We pass our own subscription id to Safepay as the checkout `reference`, so
 * that is the primary way back to our row; the Safepay subscription token is
 * the fallback once the link has been established.
 */
export async function recordSubscriptionCharge(
  eventType: string,
  data: Record<string, unknown>,
) {
  const supabase = createAdminClient();

  const reference = asString(data.reference);
  const safepaySubscriptionId =
    asString(data.token) ?? asString(data.subscription_id);
  const safepayStatus = asString(data.status);

  let query = supabase
    .from("subscriptions")
    .select("id, client_id, name, amount, frequency, next_due_date");

  if (reference) {
    query = query.eq("id", reference);
  } else if (safepaySubscriptionId) {
    query = query.eq("safepay_subscription_id", safepaySubscriptionId);
  } else {
    console.warn("safepay: subscription event with no reference or token");
    return;
  }

  const { data: subscription } = await query.maybeSingle();

  if (!subscription) {
    console.warn("safepay: no local subscription for", reference ?? safepaySubscriptionId);
    return;
  }

  if (eventType === "subscription.created") {
    await supabase
      .from("subscriptions")
      .update({
        auto_billing: true,
        safepay_subscription_id: safepaySubscriptionId,
        safepay_status: safepayStatus ?? "active",
        status: "active",
      })
      .eq("id", subscription.id);
    return;
  }

  if (eventType === "subscription.cancelled") {
    // Auto-billing is off again, so the daily function goes back to raising
    // invoices this client pays by hand.
    await supabase
      .from("subscriptions")
      .update({
        auto_billing: false,
        safepay_status: safepayStatus ?? "cancelled",
      })
      .eq("id", subscription.id);
    return;
  }

  if (eventType === "subscription.payment_failed") {
    await supabase
      .from("subscriptions")
      .update({ safepay_status: safepayStatus ?? "past_due" })
      .eq("id", subscription.id);
    return;
  }

  if (eventType !== "subscription.payment_succeeded") return;

  // Safepay has already taken the money, so the invoice is created settled -
  // it exists for the record and the receipt, not to ask for payment.
  const today = format(new Date(), DATE_FORMAT);
  const chargeId =
    asString(data.charge_id) ??
    asString(data.tracker) ??
    safepaySubscriptionId ??
    null;

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      subscription_id: subscription.id,
      client_id: subscription.client_id,
      amount: subscription.amount,
      invoice_date: today,
      due_date: today,
      status: "paid",
      notes: `Auto-billed by Safepay (${subscription.name})`,
      safepay_tracker: chargeId,
    })
    .select("id, invoice_number, amount")
    .single();

  if (invoiceError || !invoice) {
    console.error("safepay: could not create auto-billed invoice", invoiceError);
    return;
  }

  await supabase.from("payments").insert({
    invoice_id: invoice.id,
    gateway: "safepay",
    transaction_id: chargeId,
    amount: invoice.amount,
    paid_at: new Date().toISOString(),
  });

  await supabase
    .from("subscriptions")
    .update({
      safepay_status: safepayStatus ?? "active",
      next_due_date: advanceDueDate(subscription.next_due_date, subscription.frequency),
    })
    .eq("id", subscription.id);

  const { data: client } = await supabase
    .from("clients")
    .select("name, email")
    .eq("id", subscription.client_id)
    .single();

  if (client?.email) {
    await sendReceiptEmail({
      to: client.email,
      clientName: client.name,
      invoiceNumber: invoice.invoice_number,
      amount: formatCurrency(invoice.amount),
      paidAt: formatDate(today),
      gateway: "Safepay (auto-billed)",
    });
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
