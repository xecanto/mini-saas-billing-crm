import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Public, unauthenticated page - use the service-role client since the
  // anon key is restricted to authenticated users by RLS. Only ever select
  // the specific invoice by its non-guessable UUID, and only display fields
  // that are safe to show to whoever holds the link.
  const supabase = createAdminClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("invoice_number, amount, due_date, status, clients(name, company)")
    .eq("id", id)
    .single();

  if (!invoice) notFound();

  const isPaid = invoice.status === "paid";

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{invoice.invoice_number}</CardTitle>
            <StatusBadge status={invoice.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {invoice.clients && (
            <div>
              <p className="text-muted-foreground">Billed to</p>
              <p className="font-medium">
                {invoice.clients.name}
                {invoice.clients.company && ` (${invoice.clients.company})`}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="text-lg font-semibold">
                {formatCurrency(invoice.amount)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Due date</p>
              <p>{formatDate(invoice.due_date)}</p>
            </div>
          </div>

          {isPaid ? (
            <p className="rounded-md bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-400">
              This invoice has been paid. Thank you!
            </p>
          ) : (
            <p className="rounded-md bg-muted p-3 text-muted-foreground">
              To complete payment via bank transfer, JazzCash, or Easypaisa,
              please contact us and reference invoice{" "}
              <strong>{invoice.invoice_number}</strong>.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
