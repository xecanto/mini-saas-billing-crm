import type { NextRequest } from "next/server";
import { authenticateRequest, json, preflight } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BillingPeriod } from "@/types/database";

const BILLING_PERIODS = [
  "monthly",
  "quarterly",
  "yearly",
  "one_time",
] as const satisfies readonly BillingPeriod[];

export function OPTIONS() {
  return preflight();
}

/**
 * GET /api/v1/plans
 *
 * The public catalogue, for pricing pages on your other websites.
 * Optional ?service=<name|uuid> and ?billing_period=monthly|yearly|one_time.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, "read");
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const { searchParams } = request.nextUrl;

  let query = supabase
    .from("plans")
    .select(
      "id, name, billing_period, amount, currency, description, features, sort_order, services(id, name, description, website_url, status)",
    )
    // Only ever expose plans explicitly marked public and active - this is the
    // one place where the outside world reads your catalogue.
    .eq("is_public", true)
    .eq("status", "active")
    .order("sort_order")
    .order("amount");

  // Narrow the caller-supplied value to the column's own union rather than
  // passing an arbitrary string through to PostgREST.
  const billingPeriod = BILLING_PERIODS.find(
    (period) => period === searchParams.get("billing_period"),
  );
  if (billingPeriod) query = query.eq("billing_period", billingPeriod);

  const { data, error } = await query;
  if (error) return json({ error: error.message }, { status: 500 });

  const service = searchParams.get("service")?.toLowerCase();

  const plans = (data ?? [])
    .map((plan) => {
      const svc = plan.services as {
        id: string;
        name: string;
        description: string | null;
        website_url: string | null;
        status: string;
      } | null;
      return { ...plan, services: svc };
    })
    // An inactive service should not sell through the API even if its plans
    // are still marked active.
    .filter((plan) => plan.services?.status === "active")
    .filter(
      (plan) =>
        !service ||
        plan.services?.name.toLowerCase() === service ||
        plan.services?.id === service,
    )
    .map((plan) => ({
      id: plan.id,
      name: plan.name,
      billing_period: plan.billing_period,
      amount: Number(plan.amount),
      currency: plan.currency,
      description: plan.description,
      features: plan.features,
      service: plan.services
        ? {
            id: plan.services.id,
            name: plan.services.name,
            description: plan.services.description,
            website_url: plan.services.website_url,
          }
        : null,
    }));

  return json({ plans });
}
