"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { subscriptionSchema } from "@/lib/validations/subscription";

export async function createSubscriptionRecord(values: unknown) {
  const parsed = subscriptionSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  const supabase = await createClient();
  const { error } = await supabase.from("subscriptions").insert(parsed.data);

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
    .update(parsed.data)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/subscriptions");
  revalidatePath(`/clients/${parsed.data.client_id}`);
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
