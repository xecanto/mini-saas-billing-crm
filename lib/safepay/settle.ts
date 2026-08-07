import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReceiptEmail } from "@/lib/email/send";
import { formatCurrency, formatDate } from "@/lib/format";

export type SettleResult =
  | { status: "settled"; invoiceId: string; invoiceNumber: string }
  | { status: "already-paid"; invoiceId: string }
  | { status: "not-found" };

/**
 * Marks the invoice behind a Safepay tracker as paid, records the payment and
 * emails a receipt - exactly once.
 *
 * The customer's browser redirect and Safepay's webhook both land here, often
 * within the same second, so the write has to be a compare-and-set: only the
 * caller whose UPDATE actually matches a still-unpaid row goes on to insert the
 * payment and send the receipt. The loser sees "already-paid" and does nothing.
 */
export async function settleInvoiceByTracker(
  tracker: string,
  paidAt = new Date(),
): Promise<SettleResult> {
  const supabase = createAdminClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number, amount, status, client_id")
    .eq("safepay_tracker", tracker)
    .maybeSingle();

  if (!invoice) return { status: "not-found" };
  if (invoice.status === "paid") {
    return { status: "already-paid", invoiceId: invoice.id };
  }

  // Atomic claim: `neq('status', 'paid')` means a concurrent settlement that
  // already flipped the row leaves us with zero matched rows.
  const { data: claimed } = await supabase
    .from("invoices")
    .update({ status: "paid" })
    .eq("id", invoice.id)
    .neq("status", "paid")
    .select("id, invoice_number, amount, client_id")
    .maybeSingle();

  if (!claimed) return { status: "already-paid", invoiceId: invoice.id };

  const { error: paymentError } = await supabase.from("payments").insert({
    invoice_id: claimed.id,
    gateway: "safepay",
    transaction_id: tracker,
    amount: claimed.amount,
    paid_at: paidAt.toISOString(),
  });

  if (paymentError) {
    console.error("safepay: payment row failed for", claimed.id, paymentError);
  }

  const { data: client } = await supabase
    .from("clients")
    .select("name, email")
    .eq("id", claimed.client_id)
    .single();

  if (client?.email) {
    const { error: emailError } = await sendReceiptEmail({
      to: client.email,
      clientName: client.name,
      invoiceNumber: claimed.invoice_number,
      amount: formatCurrency(claimed.amount),
      paidAt: formatDate(paidAt.toISOString()),
      gateway: "Safepay",
    });
    if (emailError) {
      console.error("safepay: receipt email failed", emailError);
    }
  }

  return {
    status: "settled",
    invoiceId: claimed.id,
    invoiceNumber: claimed.invoice_number,
  };
}
