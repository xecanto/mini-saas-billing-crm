import Link from "next/link";
import { Users, Repeat, Wallet, AlertTriangle } from "lucide-react";
import { addDays, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";

function toMonthlyAmount(amount: number, frequency: string): number {
  if (frequency === "quarterly") return amount / 3;
  if (frequency === "yearly") return amount / 12;
  return amount;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const weekAhead = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const [
    { count: activeClientsCount },
    { data: activeSubscriptions },
    { data: overdueInvoices },
    { data: dueSoonInvoices },
    { data: recentInvoices },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("subscriptions")
      .select("amount, frequency")
      .eq("status", "active"),
    supabase.from("invoices").select("amount").eq("status", "overdue"),
    supabase
      .from("invoices")
      .select("*, clients(id, name)")
      .in("status", ["pending", "overdue"])
      .lte("due_date", weekAhead)
      .order("due_date", { ascending: true })
      .limit(8),
    supabase
      .from("invoices")
      .select("*, clients(id, name)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const mrr = (activeSubscriptions ?? []).reduce(
    (sum, s) => sum + toMonthlyAmount(s.amount, s.frequency),
    0,
  );
  const overdueTotal = (overdueInvoices ?? []).reduce(
    (sum, i) => sum + i.amount,
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview as of {formatDate(today)}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Clients"
          value={String(activeClientsCount ?? 0)}
          icon={Users}
        />
        <StatCard
          label="Active Subscriptions"
          value={String(activeSubscriptions?.length ?? 0)}
          icon={Repeat}
        />
        <StatCard
          label="Monthly Recurring Revenue"
          value={formatCurrency(mrr)}
          hint="Normalized to a monthly value"
          icon={Wallet}
        />
        <StatCard
          label="Overdue"
          value={formatCurrency(overdueTotal)}
          hint={`${overdueInvoices?.length ?? 0} invoice(s)`}
          icon={AlertTriangle}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Due within 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            {dueSoonInvoices && dueSoonInvoices.length > 0 ? (
              <ul className="divide-y">
                {dueSoonInvoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <div>
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-medium hover:underline"
                      >
                        {invoice.invoice_number}
                      </Link>
                      <p className="text-muted-foreground">
                        {invoice.clients?.name ?? "—"} ·{" "}
                        {formatDate(invoice.due_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatCurrency(invoice.amount)}
                      </span>
                      <StatusBadge status={invoice.status} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing due in the next 7 days.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {recentInvoices && recentInvoices.length > 0 ? (
              <ul className="divide-y">
                {recentInvoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <div>
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-medium hover:underline"
                      >
                        {invoice.invoice_number}
                      </Link>
                      <p className="text-muted-foreground">
                        {invoice.clients?.name ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatCurrency(invoice.amount)}
                      </span>
                      <StatusBadge status={invoice.status} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
