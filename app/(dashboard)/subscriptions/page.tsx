import { createClient } from "@/lib/supabase/server";
import { SubscriptionsTable } from "./subscriptions-table";
import { SubscriptionFormDialog } from "./subscription-form-dialog";

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const [{ data: subscriptions }, { data: catalogue }, { data: clients }] =
    await Promise.all([
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
      supabase.from("clients").select("id, name, company").order("name"),
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            All recurring packages across every client.
          </p>
        </div>
        <SubscriptionFormDialog plans={plans} clients={clients ?? []} />
      </div>
      <SubscriptionsTable
        subscriptions={subscriptions ?? []}
        showClient
        plans={plans}
      />
    </div>
  );
}
