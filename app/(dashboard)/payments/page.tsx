import { createClient } from "@/lib/supabase/server";
import { PaymentsTable } from "./payments-table";

export default async function PaymentsPage() {
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("*, invoices(id, invoice_number, client_id, clients(id, name))")
    .order("paid_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Every payment recorded across all clients.
        </p>
      </div>
      <PaymentsTable payments={payments ?? []} />
    </div>
  );
}
