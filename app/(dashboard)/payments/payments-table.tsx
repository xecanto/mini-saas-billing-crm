"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Payment } from "@/types/database";

export type PaymentWithInvoice = Payment & {
  invoices: {
    id: string;
    invoice_number: string;
    client_id: string;
    clients: { id: string; name: string } | null;
  } | null;
};

export function PaymentsTable({
  payments,
  showClient = true,
}: {
  payments: PaymentWithInvoice[];
  showClient?: boolean;
}) {
  if (payments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No payments recorded yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Invoice</TableHead>
            {showClient && <TableHead>Client</TableHead>}
            <TableHead>Method</TableHead>
            <TableHead>Transaction ID</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="text-muted-foreground">
                {formatDate(payment.paid_at)}
              </TableCell>
              <TableCell className="font-medium">
                {payment.invoices ? (
                  <Link
                    href={`/invoices/${payment.invoices.id}`}
                    className="hover:underline"
                  >
                    {payment.invoices.invoice_number}
                  </Link>
                ) : (
                  "—"
                )}
              </TableCell>
              {showClient && (
                <TableCell>
                  {payment.invoices?.clients ? (
                    <Link
                      href={`/clients/${payment.invoices.clients.id}`}
                      className="text-muted-foreground hover:underline"
                    >
                      {payment.invoices.clients.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
              )}
              <TableCell className="capitalize text-muted-foreground">
                {payment.gateway.replace("_", " ")}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {payment.transaction_id || "—"}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(payment.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
