"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/api/auth";
import { apiKeySchema } from "@/lib/validations/service";

/**
 * Creates an API key for one of your websites.
 *
 * The plaintext key comes back exactly once, here, and is never recoverable -
 * only its hash is stored. If it is lost the key must be revoked and replaced.
 */
export async function createApiKeyRecord(values: unknown) {
  const parsed = apiKeySchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the form for errors." };

  const supabase = await createClient();
  const { key, keyHash, keyPrefix } = generateApiKey();

  const { error } = await supabase.from("api_keys").insert({
    name: parsed.data.name,
    key_prefix: keyPrefix,
    key_hash: keyHash,
    scopes: parsed.data.scopes,
  });

  if (error) return { error: error.message };

  revalidatePath("/integrations");
  return { error: null, key };
}

export async function revokeApiKeyRecord(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/integrations");
  return { error: null };
}

export async function deleteApiKeyRecord(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("api_keys").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/integrations");
  return { error: null };
}
