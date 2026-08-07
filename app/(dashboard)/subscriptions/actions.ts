"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  subscriptionSchema,
  type SubscriptionFormValues,
} from "@/lib/validations/subscription";
import { createSafepayClient, isSafepayConfigured } from "@/lib/safepay/client";
import { createPlan } from "@/lib/safepay/plans";
import { getAppUrl } from "@/lib/urls";

// price_overridden rides alongside the validated fields rather than inside the
// schema: the form derives it by comparing the amount against the chosen plan,
// so it is a computed flag, not user input to validate.
function withPlanFields(
  data: SubscriptionFormValues,
  values: unknown,
) {
  const { plan_id, ...rest } = data;
  return {
    ...rest,
    plan_id: plan_id || null,
    price_overridden: Boolean(
      (values as { price_overridden?: boolean })?.price_overridden,
    ),
  };
}

export async function createSubscriptionRecord(values: unknown) {
  const parsed = subscriptionSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .insert(withPlanFields(parsed.data, values));

  if (error) return { error: error.message };

  revalidatePath("/subscriptions");
  revalidatePath(`/clients/${parsed.data.client_id}`);
  return { error: null };
}

export async function updateSubscriptionRecord(id: string, values: unknown) {
  const parsed = subscriptionSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update(withPlanFields(parsed.data, values))
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/subscriptions");
  revalidatePath(`/clients/${parsed.data.client_id}`);
  return { error: null };
}

/**
 * Produces the link a client follows to put a card on file and let Safepay
 * charge this subscription automatically.
 *
 * The Safepay plan is created once and cached on the row - plans are immutable
 * as far as amount and interval go, so changing either means a new plan.
 * `reference` carries our subscription id, which is how the webhook finds its
 * way back to this row.
 */
export async function createSafepaySubscriptionLink(id: string) {
  if (!isSafepayConfigured()) {
    return { error: "Safepay is not configured on this environment." };
  }

  const supabase = await createClient();

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("id, client_id, name, amount, currency, frequency, safepay_plan_id")
    .eq("id", id)
    .single();

  if (error || !subscription) return { error: "Subscription not found." };

  try {
    let planId = subscription.safepay_plan_id;

    if (!planId) {
      const created = await createPlan({
        name: subscription.name,
        amount: subscription.amount,
        currency: subscription.currency || "PKR",
        frequency: subscription.frequency,
      });
      planId = created.planId;

      const { error: saveError } = await supabase
        .from("subscriptions")
        .update({ safepay_plan_id: planId })
        .eq("id", subscription.id);

      if (saveError) return { error: saveError.message };
    }

    const safepay = createSafepayClient();
    const appUrl = getAppUrl();

    const url = await safepay.checkout.createSubscription({
      planId,
      reference: subscription.id,
      redirectUrl: `${appUrl}/subscriptions?subscribed=1`,
      cancelUrl: `${appUrl}/subscriptions?subscribed=0`,
    });

    revalidatePath("/subscriptions");
    return { error: null, url };
  } catch (e) {
    console.error("safepay: subscription link failed", e);
    const message =
      e instanceof Error ? e.message : "Could not reach the payment gateway.";
    return { error: message };
  }
}

export async function cancelSafepayAutoBilling(id: string) {
  const supabase = await createClient();

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("id, client_id, safepay_subscription_id")
    .eq("id", id)
    .single();

  if (error || !subscription) return { error: "Subscription not found." };

  if (subscription.safepay_subscription_id) {
    try {
      const safepay = createSafepayClient();
      await safepay.subscription.cancel(subscription.safepay_subscription_id);
    } catch (e) {
      console.error("safepay: cancel failed", e);
      return { error: "Safepay refused the cancellation. Try again." };
    }
  }

  // The webhook flips these too, but doing it here means the dashboard is
  // correct immediately rather than whenever the callback lands.
  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({ auto_billing: false, safepay_status: "cancelled" })
    .eq("id", id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/subscriptions");
  revalidatePath(`/clients/${subscription.client_id}`);
  return { error: null };
}

export async function deleteSubscriptionRecord(id: string, clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/subscriptions");
  revalidatePath(`/clients/${clientId}`);
  return { error: null };
}
