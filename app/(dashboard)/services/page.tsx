import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import type { Plan, Service } from "@/types/database";
import { ServiceFormDialog } from "./service-form-dialog";
import { PlanFormDialog } from "./plan-form-dialog";
import { ServiceActions } from "./service-actions";
import { PlanRow } from "./plan-row";

export const PERIOD_LABEL: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Annual",
  one_time: "One-time",
};

export default async function ServicesPage() {
  const supabase = await createClient();

  const [{ data: services }, { data: plans }, { data: subscriptions }] =
    await Promise.all([
      supabase
        .from("services")
        .select("*")
        .order("sort_order")
        .order("name"),
      supabase
        .from("plans")
        .select("*")
        .order("sort_order")
        .order("amount"),
      // Subscriber counts per plan, so you can see traction at a glance.
      supabase
        .from("subscriptions")
        .select("plan_id, status")
        .neq("status", "cancelled"),
    ]);

  const countsByPlan = new Map<string, number>();
  for (const sub of subscriptions ?? []) {
    if (!sub.plan_id) continue;
    countsByPlan.set(sub.plan_id, (countsByPlan.get(sub.plan_id) ?? 0) + 1);
  }

  const plansByService = new Map<string, Plan[]>();
  for (const plan of (plans ?? []) as Plan[]) {
    const list = plansByService.get(plan.service_id) ?? [];
    list.push(plan);
    plansByService.set(plan.service_id, list);
  }

  const list = (services ?? []) as Service[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Services &amp; plans</h1>
          <p className="text-sm text-muted-foreground">
            What you sell, and at what price. Plans here are what clients
            subscribe to — and what your other websites can display and sell.
          </p>
        </div>
        <ServiceFormDialog />
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No services yet. Add one — for example &ldquo;POS Software&rdquo; —
          then give it monthly and annual plans.
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((service) => {
            const servicePlans = plansByService.get(service.id) ?? [];
            const subscribers = servicePlans.reduce(
              (sum, plan) => sum + (countsByPlan.get(plan.id) ?? 0),
              0,
            );

            return (
              <Card key={service.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">
                          {service.name}
                        </CardTitle>
                        {service.status === "inactive" && (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                        <Badge variant="secondary">
                          {subscribers} subscriber{subscribers === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      {service.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {service.description}
                        </p>
                      )}
                      {service.website_url && (
                        <a
                          href={service.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          {service.website_url}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <PlanFormDialog serviceId={service.id} />
                      <ServiceFormDialog service={service} />
                      <ServiceActions serviceId={service.id} />
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {servicePlans.length === 0 ? (
                    <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No plans yet. Add a monthly and an annual price.
                    </p>
                  ) : (
                    <div className="divide-y rounded-md border">
                      {servicePlans.map((plan) => (
                        <PlanRow
                          key={plan.id}
                          plan={plan}
                          subscriberCount={countsByPlan.get(plan.id) ?? 0}
                          periodLabel={
                            PERIOD_LABEL[plan.billing_period] ??
                            plan.billing_period
                          }
                          formattedAmount={formatCurrency(
                            plan.amount,
                            plan.currency,
                          )}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
