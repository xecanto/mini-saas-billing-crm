import { createClient } from "@/lib/supabase/server";
import { SubscriptionsTable } from "./subscriptions-table";

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const [{ data: subscriptions }, { data: catalogue }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*, clients(id, name, phone)")
      .order("next_due_date", { ascending: true }),
    supabase
      .from("plans")
      .select("id, name, amount, currency, billing_period, services(name)")
      .eq("status", "active")
      .neq("billing_period", "one_time")
      .order("sort_order"),
  ]);

  const plans = (catalogue ?? []).map((plan) => ({
    id: plan.id,
    label: [(plan.services as { name: string } | null)?.name, plan.name]
      .filter(Boolean)
      .join(" — "),
    amount: Number(plan.amount),
    currency: plan.currency,
    billing_period: plan.billing_period as "monthly" | "quarterly" | "yearly",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">
          All recurring packages across every client. Add a subscription from
          a client&apos;s page.
        </p>
      </div>
      <SubscriptionsTable
        subscriptions={subscriptions ?? []}
        showClient
        plans={plans}
      />
    </div>
  );
}
