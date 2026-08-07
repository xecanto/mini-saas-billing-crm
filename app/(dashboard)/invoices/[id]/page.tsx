import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { buildInvoiceReminderMessage } from "@/lib/whatsapp";
import { getInvoicePayUrl } from "@/lib/urls";
import { MarkPaidDialog } from "./mark-paid-dialog";
import { WhatsAppReminderButton } from "./whatsapp-reminder-button";
import { InvoiceActions } from "./invoice-actions";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, clients(id, name, phone, email, company), subscriptions(name)")
    .eq("id", id)
    .single();

  if (!invoice) notFound();

  const [{ data: payments }, { data: reminders }] = await Promise.all([
    supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", id)
      .order("paid_at", { ascending: false }),
    supabase
      .from("reminders")
      .select("*")
      .eq("invoice_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const client = invoice.clients;
  const canCancel = invoice.status === "pending" || invoice.status === "overdue";
  const canMarkPaid = canCancel;

  const whatsappMessage = client
    ? buildInvoiceReminderMessage({
        clientName: client.name,
        invoiceNumber: invoice.invoice_number,
        amount: formatCurrency(invoice.amount),
        dueDate: formatDate(invoice.due_date),
        payUrl: getInvoicePayUrl(invoice.id),
      })
    : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{invoice.invoice_number}</h1>
            <StatusBadge status={invoice.status} />
          </div>
          {client && (
            <p className="text-sm text-muted-foreground">
              Billed to{" "}
              <Link href={`/clients/${client.id}`} className="hover:underline">
                {client.name}
              </Link>
              {invoice.subscriptions && ` · ${invoice.subscriptions.name}`}
            </p>
          )}
        </div>
        <InvoiceActions
          invoiceId={invoice.id}
          clientId={invoice.client_id}
          canCancel={canCancel}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Invoice details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(invoice.amount)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <StatusBadge status={invoice.status} />
              </div>
              <div>
                <p className="text-muted-foreground">Invoice date</p>
                <p>{formatDate(invoice.invoice_date)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Due date</p>
                <p>{formatDate(invoice.due_date)}</p>
              </div>
            </div>
            {invoice.notes && (
              <div>
                <p className="text-muted-foreground">Notes</p>
                <p>{invoice.notes}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {canMarkPaid && (
                <MarkPaidDialog invoiceId={invoice.id} amount={invoice.amount} />
              )}
              <Button variant="outline" asChild className="gap-2">
                <a href={`/api/invoices/${invoice.id}/pdf`} download>
                  <Download className="size-4" />
                  Download PDF
                </a>
              </Button>
              {client && (
                <WhatsAppReminderButton
                  phone={client.phone}
                  message={whatsappMessage}
                  invoiceId={invoice.id}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {client ? (
              <>
                <p className="font-medium">{client.name}</p>
                {client.company && (
                  <p className="text-muted-foreground">{client.company}</p>
                )}
                <p className="text-muted-foreground">{client.phone}</p>
                {client.email && (
                  <p className="text-muted-foreground">{client.email}</p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Client not found</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {payments && payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.paid_at)}</TableCell>
                    <TableCell className="capitalize">
                      {payment.gateway.replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.transaction_id || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No payments recorded yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reminder log</CardTitle>
        </CardHeader>
        <CardContent>
          {reminders && reminders.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {reminders.map((reminder) => (
                <li
                  key={reminder.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                >
                  <span className="capitalize">{reminder.channel} reminder</span>
                  <span className="text-muted-foreground">
                    {formatDateTime(reminder.sent_at ?? reminder.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No reminders sent yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
