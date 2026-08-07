import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { CancelSubscriptionCard } from "./cancel-subscription-card";

const PERIOD_LABEL: Record<string, string> = {
  monthly: "every month",
  quarterly: "every 3 months",
  yearly: "every year",
};

export default async function ManageSubscriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Public page reached with an unguessable id, so the service-role client is
  // used and only fields safe to show the subscriber are selected.
  const supabase = createAdminClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select(
      "id, name, amount, currency, frequency, next_due_date, status, auto_billing, clients(name, company)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!subscription) notFound();

  const client = subscription.clients as
    | { name: string; company: string | null }
    | null;
  const isCancelled = subscription.status === "cancelled";

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-xl">{subscription.name}</CardTitle>
            <StatusBadge status={subscription.status} />
          </div>
        </CardHeader>

        <CardContent className="space-y-5 text-sm">
          {client && (
            <div>
              <p className="text-muted-foreground">Subscriber</p>
              <p className="font-medium">
                {client.name}
                {client.company && ` (${client.company})`}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="text-lg font-semibold">
                {formatCurrency(subscription.amount, subscription.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                {PERIOD_LABEL[subscription.frequency] ?? subscription.frequency}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {isCancelled ? "Was due" : "Next payment"}
              </p>
              <p>{formatDate(subscription.next_due_date)}</p>
            </div>
          </div>

          {isCancelled ? (
            <p className="rounded-md bg-muted p-3 text-muted-foreground">
              This subscription is cancelled. You will not be charged again.
            </p>
          ) : (
            <CancelSubscriptionCard
              subscriptionId={subscription.id}
              planName={subscription.name}
              nextDueDate={formatDate(subscription.next_due_date)}
              autoBilling={subscription.auto_billing}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
