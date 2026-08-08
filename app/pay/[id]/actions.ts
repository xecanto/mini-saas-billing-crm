"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSafepayClient, toSafepayAmount } from "@/lib/safepay/client";
import { getAppUrl } from "@/lib/urls";
import type { SafepayCurrency } from "@sfpy/node-sdk/dist/types";

// Called from the public invoice page, so it must not trust anything but the
// invoice id: the amount comes from the database, never from the client.
export async function startSafepayCheckout(invoiceId: string) {
  const supabase = createAdminClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, amount, status")
    .eq("id", invoiceId)
    .single();

  if (error || !invoice) {
    return { error: "Invoice not found." };
  }

  if (invoice.status === "paid") {
    return { error: "This invoice has already been paid." };
  }

  if (invoice.status === "cancelled") {
    return { error: "This invoice has been cancelled." };
  }

  const safepay = createSafepayClient();
  const appUrl = getAppUrl();

  let checkoutUrl: string;
  try {
    const { token } = await safepay.payments.create({
      amount: toSafepayAmount(invoice.amount),
      currency: "PKR" as SafepayCurrency,
    });

    // The tracker is recorded now so the webhook can find this invoice even if
    // the customer closes the tab before being redirected back.
    const { error: trackerError } = await supabase
      .from("invoices")
      .update({ safepay_tracker: token })
      .eq("id", invoice.id);

    if (trackerError) {
      return { error: "Could not start the payment. Please try again." };
    }

    checkoutUrl = safepay.checkout.create({
      token,
      orderId: invoice.invoice_number,
      redirectUrl: `${appUrl}/pay/${invoice.id}/return`,
      cancelUrl: `${appUrl}/pay/${invoice.id}?status=cancelled`,
      source: "custom",
      webhooks: true,
    });
  } catch (e) {
    console.error("safepay checkout setup failed", e);
    return { error: "Could not reach the payment gateway. Please try again." };
  }

  redirect(checkoutUrl);
}
