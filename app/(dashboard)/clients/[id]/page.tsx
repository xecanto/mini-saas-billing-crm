import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { ClientFormDialog } from "../client-form-dialog";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { deleteClientRecord } from "../actions";
import { SubscriptionFormDialog } from "../../subscriptions/subscription-form-dialog";
import { SubscriptionsTable } from "../../subscriptions/subscriptions-table";
import { InvoicesTable } from "../../invoices/invoices-table";
import { PaymentsTable } from "../../payments/payments-table";
import { OneTimeChargeDialog } from "./one-time-charge-dialog";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (!client) notFound();

  const [
    { data: subscriptions },
    { data: invoices },
    { data: payments },
    { data: catalogue },
  ] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("*, clients(id, name, phone)")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("invoices")
        .select("*, clients(id, name)")
        .eq("client_id", id)
        .order("due_date", { ascending: false }),
      supabase
        .from("payments")
        .select("*, invoices!inner(id, invoice_number, client_id, clients(id, name))")
        .eq("invoices.client_id", id)
        .order("paid_at", { ascending: false }),
      supabase
        .from("plans")
        .select("id, name, amount, currency, billing_period, services(name)")
        .eq("status", "active")
        .order("sort_order"),
    ]);

  const plans = catalogue ?? [];

  const oneTimePlans = plans
    .filter((plan) => plan.billing_period === "one_time")
    .map((plan) => ({
      id: plan.id,
      label: [(plan.services as { name: string } | null)?.name, plan.name]
        .filter(Boolean)
        .join(" — "),
      amount: Number(plan.amount),
    }));

  const recurringPlans = plans
    .filter((plan) => plan.billing_period !== "one_time")
    .map((plan) => ({
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{client.name}</h1>
            <StatusBadge status={client.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {[client.company, client.service_type, client.phone]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <OneTimeChargeDialog
            clientId={client.id}
            clientHasEmail={!!client.email}
            plans={oneTimePlans}
          />
          <ClientFormDialog client={client} />
          <DeleteConfirmButton
            title={`Delete ${client.name}?`}
            description="This also deletes all of their subscriptions, invoices, and payment history. This cannot be undone."
            // This page is a Server Component, so an arrow function here would
            // be a plain closure React cannot serialise across the boundary.
            // A bound Server Action is a reference, which it can.
            onDelete={deleteClientRecord.bind(null, client.id)}
            redirectTo="/clients"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Contact details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p>{client.phone}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p>{client.email || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Company</p>
              <p>{client.company || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Service type</p>
              <p>{client.service_type || "—"}</p>
            </div>
            {client.notes && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Notes</p>
                <p>{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href={`/invoices/new?client_id=${client.id}`}>
                <Plus className="size-4" />
                New Invoice
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Subscriptions</h2>
          <SubscriptionFormDialog clientId={client.id} plans={recurringPlans} />
        </div>
        <SubscriptionsTable
          subscriptions={subscriptions ?? []}
          plans={recurringPlans}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Invoices</h2>
        <InvoicesTable invoices={invoices ?? []} showClient={false} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Payment history</h2>
        <PaymentsTable payments={payments ?? []} showClient={false} />
      </section>
    </div>
  );
}
