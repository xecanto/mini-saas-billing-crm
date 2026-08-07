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
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Invoice } from "@/types/database";

export type InvoiceWithClient = Invoice & {
  clients?: { id: string; name: string } | null;
};

export function InvoicesTable({
  invoices,
  showClient = true,
}: {
  invoices: InvoiceWithClient[];
  showClient?: boolean;
}) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No invoices found.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            {showClient && <TableHead>Client</TableHead>}
            <TableHead>Amount</TableHead>
            <TableHead>Due date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="hover:underline"
                >
                  {invoice.invoice_number}
                </Link>
              </TableCell>
              {showClient && (
                <TableCell>
                  {invoice.clients ? (
                    <Link
                      href={`/clients/${invoice.clients.id}`}
                      className="text-muted-foreground hover:underline"
                    >
                      {invoice.clients.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
              )}
              <TableCell>{formatCurrency(invoice.amount)}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(invoice.due_date)}
              </TableCell>
              <TableCell>
                <StatusBadge status={invoice.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
