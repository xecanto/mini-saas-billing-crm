"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clientSchema } from "@/lib/validations/client";

export async function createClientRecord(values: unknown) {
  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  const supabase = await createClient();
  const { email, ...rest } = parsed.data;
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...rest, email: email || null })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/clients");
  return { error: null, id: data.id as string };
}

export async function updateClientRecord(id: string, values: unknown) {
  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  const supabase = await createClient();
  const { email, ...rest } = parsed.data;
  const { error } = await supabase
    .from("clients")
    .update({ ...rest, email: email || null })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { error: null };
}

export async function deleteClientRecord(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clients");
  return { error: null };
}
