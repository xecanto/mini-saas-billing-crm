import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { SUPABASE_SECRET_KEY, SUPABASE_URL } from "./env";

// Service-role client: bypasses Row Level Security entirely.
// Server-only (cron jobs, admin scripts) - never import this from client code
// or from anything reachable by an unauthenticated request.
export function createAdminClient() {
  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
