import { createClient } from "@/lib/supabase/server";
import { ClientsTable } from "./clients-table";
import { ClientFormDialog } from "./client-form-dialog";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Manage the businesses and contacts you bill.
          </p>
        </div>
        <ClientFormDialog />
      </div>
      <ClientsTable clients={clients ?? []} />
    </div>
  );
}
