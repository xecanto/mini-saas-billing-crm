"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { planSchema, serviceSchema } from "@/lib/validations/service";
import { updateSafepayPlanAmount } from "@/lib/safepay/plans";
import { sendPriceChangeEmail } from "@/lib/email/send";
import { formatCurrency } from "@/lib/format";
import { getManageSubscriptionUrl } from "@/lib/urls";

function clean<T extends Record<string, unknown>>(values: T) {
  // Empty optional text inputs should be null in the database, not "".
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, v === "" ? null : v]),
  ) as T;
}

// =============================================================== services

export async function createServiceRecord(values: unknown) {
  const parsed = serviceSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  const supabase = await createClient();
  const { error } = await supabase.from("services").insert(clean(parsed.data));

  if (error) {
    return {
      error: error.code === "23505" ? "A service with that name already exists." : error.message,
    };
  }

  revalidatePath("/services");
  return { error: null };
}

export async function updateServiceRecord(id: string, values: unknown) {
  const parsed = serviceSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update(clean(parsed.data))
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/services");
  return { error: null };
}

export async function deleteServiceRecord(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/services");
  return { error: null };
}

// ================================================================== plans

export async function createPlanRecord(values: unknown) {
  const parsed = planSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  const supabase = await createClient();
  const { error } = await supabase.from("plans").insert(clean(parsed.data));

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That service already has a plan with this name and billing period."
          : error.message,
    };
  }

  revalidatePath("/services");
  return { error: null };
}

/**
 * Reports what a price change would affect, without changing anything.
 *
 * The dialog calls this first so you can see who is on the plan and how many
 * are on negotiated prices before deciding whether to push the new amount.
 */
export async function previewPlanPriceChange(id: string, newAmount: number) {
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("plans")
    .select("id, name, amount, currency, safepay_plan_id")
    .eq("id", id)
    .single();

  if (!plan) return { error: "Plan not found." };

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("id, amount, price_overridden, auto_billing, clients(name)")
    .eq("plan_id", id)
    .neq("status", "cancelled");

  const all = subscriptions ?? [];
  const onListPrice = all.filter((s) => !s.price_overridden);

  return {
    error: null,
    changed: Number(plan.amount) !== newAmount,
    oldAmount: formatCurrency(plan.amount, plan.currency),
    newAmount: formatCurrency(newAmount, plan.currency),
    total: all.length,
    willChange: onListPrice.length,
    customPriced: all.length - onListPrice.length,
    autoBilled: onListPrice.filter((s) => s.auto_billing).length,
    names: onListPrice
      .map((s) => (s.clients as { name: string } | null)?.name)
      .filter(Boolean)
      .slice(0, 8),
  };
}

export async function updatePlanRecord(
  id: string,
  values: unknown,
  options: { applyToExisting: boolean; notifyClients: boolean } = {
    applyToExisting: false,
    notifyClients: false,
  },
) {
  const parsed = planSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("plans")
    .select("id, name, amount, currency, safepay_plan_id")
    .eq("id", id)
    .single();

  if (!existing) return { error: "Plan not found." };

  const { error } = await supabase
    .from("plans")
    .update(clean(parsed.data))
    .eq("id", id);

  if (error) return { error: error.message };

  const priceChanged = Number(existing.amount) !== parsed.data.amount;
  const warnings: string[] = [];

  if (priceChanged && options.applyToExisting) {
    // Clients on a negotiated price are deliberately left alone.
    const { data: affected } = await supabase
      .from("subscriptions")
      .select("id, auto_billing, clients(name, email)")
      .eq("plan_id", id)
      .eq("price_overridden", false)
      .neq("status", "cancelled");

    const { error: bulkError } = await supabase
      .from("subscriptions")
      .update({ amount: parsed.data.amount })
      .eq("plan_id", id)
      .eq("price_overridden", false)
      .neq("status", "cancelled");

    if (bulkError) warnings.push(`Local update failed: ${bulkError.message}`);

    // Safepay holds the recurring price for auto-billed clients, so it needs
    // the change too or their cards keep being charged the old amount.
    if (existing.safepay_plan_id) {
      const result = await updateSafepayPlanAmount({
        planId: existing.safepay_plan_id,
        amount: parsed.data.amount,
        applyToExistingSubscriptions: true,
      });
      if (!result.ok) warnings.push(`Safepay: ${result.error}`);
    }

    if (options.notifyClients) {
      for (const sub of affected ?? []) {
        const client = sub.clients as { name: string; email: string | null } | null;
        if (!client?.email) continue;
        await sendPriceChangeEmail({
          to: client.email,
          clientName: client.name,
          planName: parsed.data.name,
          oldAmount: formatCurrency(existing.amount, existing.currency),
          newAmount: formatCurrency(parsed.data.amount, parsed.data.currency),
          manageUrl: getManageSubscriptionUrl(sub.id),
        });
      }
    }
  }

  revalidatePath("/services");
  revalidatePath("/subscriptions");
  return { error: null, warnings };
}

export async function deletePlanRecord(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/services");
  return { error: null };
}
