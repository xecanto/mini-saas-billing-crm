import type { NextRequest } from "next/server";
import { authenticateRequest, json, preflight } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export function OPTIONS() {
  return preflight();
}

/**
 * GET /api/v1/clients/status?email=someone@example.com
 *
 * Lets another website ask "is this person a paying customer, and for what?"
 * so it can unlock a Pro area or show billing state without keeping its own
 * copy of the payment record.
 *
 * Returns 200 with `found: false` for an unknown email rather than 404: a
 * different status code per email would turn this into a customer-list oracle
 * for anyone holding a read key.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, "read");
  if (!auth.ok) return auth.response;

  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return json({ error: "email query parameter is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, email, company, status")
    .ilike("email", email)
    .maybeSingle();

  if (!client) {
    return json({ found: false, active: false, subscriptions: [] });
  }

  const [{ data: subscriptions }, { data: latestPayment }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        "id, name, amount, currency, frequency, next_due_date, status, auto_billing, plans(id, name, billing_period, services(id, name))",
      )
      .eq("client_id", client.id)
      .neq("status", "cancelled"),
    supabase
      .from("payments")
      .select("amount, paid_at, gateway, invoices!inner(client_id)")
      .eq("invoices.client_id", client.id)
      .order("paid_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const active = (subscriptions ?? []).filter((s) => s.status === "active");

  return json({
    found: true,
    active: active.length > 0,
    client: {
      id: client.id,
      name: client.name,
      email: client.email,
      company: client.company,
    },
    subscriptions: (subscriptions ?? []).map((sub) => {
      const plan = sub.plans as {
        id: string;
        name: string;
        billing_period: string;
        services: { id: string; name: string } | null;
      } | null;
      return {
        id: sub.id,
        name: sub.name,
        amount: Number(sub.amount),
        currency: sub.currency,
        frequency: sub.frequency,
        status: sub.status,
        next_due_date: sub.next_due_date,
        auto_billing: sub.auto_billing,
        plan: plan
          ? {
              id: plan.id,
              name: plan.name,
              billing_period: plan.billing_period,
              service: plan.services,
            }
          : null,
      };
    }),
    latest_payment: latestPayment
      ? {
          amount: Number(latestPayment.amount),
          paid_at: latestPayment.paid_at,
          gateway: latestPayment.gateway,
        }
      : null,
  });
}
