"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSafepayClient, isSafepayConfigured } from "@/lib/safepay/client";
import { sendSubscriptionCancelledEmail } from "@/lib/email/send";
import { formatDate } from "@/lib/format";

/**
 * Client-initiated cancellation, from the link in their emails.
 *
 * Unauthenticated by design: holding the subscription's UUID is the capability,
 * exactly as it is for the public invoice page. It can only ever cancel, never
 * read anything else or change a price, so the blast radius of a leaked link is
 * a subscription the client owns anyway.
 */
export async function cancelSubscriptionAsClient(subscriptionId: string) {
  const supabase = createAdminClient();

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("id, name, status, next_due_date, safepay_subscription_id, clients(name, email)")
    .eq("id", subscriptionId)
    .maybeSingle();

  if (error || !subscription) return { error: "Subscription not found." };
  if (subscription.status === "cancelled") {
    return { error: null, alreadyCancelled: true };
  }

  // Stop the money first. If Safepay refuses we must not tell the client they
  // are cancelled while their card is still on a live recurring charge.
  if (subscription.safepay_subscription_id && isSafepayConfigured()) {
    try {
      const safepay = createSafepayClient();
      await safepay.subscription.cancel(subscription.safepay_subscription_id);
    } catch (e) {
      console.error("safepay: client cancellation failed", e);
      return {
        error:
          "We could not cancel your payment with the gateway. Please contact us and we will sort it out.",
      };
    }
  }

  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      auto_billing: false,
      safepay_status: "cancelled",
    })
    .eq("id", subscriptionId);

  if (updateError) return { error: "Something went wrong. Please contact us." };

  const client = subscription.clients as { name: string; email: string | null } | null;
  if (client?.email) {
    await sendSubscriptionCancelledEmail({
      to: client.email,
      clientName: client.name,
      planName: subscription.name,
      lastBillingDate: formatDate(subscription.next_due_date),
    });
  }

  revalidatePath(`/manage/${subscriptionId}`);
  revalidatePath("/subscriptions");
  return { error: null, alreadyCancelled: false };
}
