import { createClient } from "@/lib/supabase/server";
import { InvoiceForm } from "./invoice-form";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>;
}) {
  const { client_id } = await searchParams;
  const supabase = await createClient();

  const [{ data: clients }, { data: subscriptions }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, company")
      .order("name", { ascending: true }),
    supabase
      .from("subscriptions")
      .select("*")
      .eq("status", "active"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New invoice</h1>
        <p className="text-sm text-muted-foreground">
          Create a one-off or subscription-linked invoice for a client.
        </p>
      </div>
      <InvoiceForm
        clients={clients ?? []}
        subscriptions={subscriptions ?? []}
        defaultClientId={client_id}
      />
    </div>
  );
}
