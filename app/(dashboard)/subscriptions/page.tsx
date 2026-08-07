import { createClient } from "@/lib/supabase/server";
import { SubscriptionsTable } from "./subscriptions-table";

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*, clients(id, name, phone)")
    .order("next_due_date", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">
          All recurring packages across every client. Add a subscription from
          a client&apos;s page.
        </p>
      </div>
      <SubscriptionsTable subscriptions={subscriptions ?? []} showClient />
    </div>
  );
}
