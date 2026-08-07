// Supabase is migrating from legacy JWT keys (`anon` / `service_role`) to the
// new key format (`sb_publishable_...` / `sb_secret_...`). Accept either so the
// project keeps working before and after the dashboard swaps them over.
//
// These must stay written as literal `process.env.NEXT_PUBLIC_*` member
// expressions - that is what Next.js statically replaces at build time.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const SUPABASE_PUBLIC_KEY = (process.env
  .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

// Server-only. Bypasses Row Level Security - never import into client code.
export const SUPABASE_SECRET_KEY = (process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY)!;
