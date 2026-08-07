import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { isSafepayConfigured } from "@/lib/safepay/client";
import { PayButton } from "./pay-button";

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const { status } = await searchParams;

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
  const isCancelled = invoice.status === "cancelled";

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

          {status === "cancelled" && !isPaid && (
            <p className="rounded-md bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
              Payment was cancelled. You can try again below.
            </p>
          )}

          {status === "failed" && !isPaid && (
            <p className="rounded-md bg-destructive/10 p-3 text-destructive">
              We could not confirm that payment. If you were charged, please
              contact us before trying again.
            </p>
          )}

          {isPaid ? (
            <p className="rounded-md bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-400">
              This invoice has been paid. Thank you!
            </p>
          ) : isCancelled ? (
            <p className="rounded-md bg-muted p-3 text-muted-foreground">
              This invoice has been cancelled. No payment is due.
            </p>
          ) : (
            <div className="space-y-4">
              {isSafepayConfigured() && (
                <PayButton
                  invoiceId={id}
                  amount={formatCurrency(invoice.amount)}
                />
              )}
              <p className="rounded-md bg-muted p-3 text-muted-foreground">
                Prefer to pay manually? Send a bank transfer, JazzCash, or
                Easypaisa payment referencing invoice{" "}
                <strong>{invoice.invoice_number}</strong> and let us know.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
