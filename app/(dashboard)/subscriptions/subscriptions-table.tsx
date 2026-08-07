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
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Subscription } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { SubscriptionFormDialog } from "./subscription-form-dialog";
import { AutoBillingButton } from "./auto-billing-button";
import { deleteSubscriptionRecord } from "./actions";

export type SubscriptionWithClient = Subscription & {
  clients: { id: string; name: string; phone: string | null } | null;
};

export function SubscriptionsTable({
  subscriptions,
  showClient = false,
}: {
  subscriptions: SubscriptionWithClient[];
  showClient?: boolean;
}) {
  if (subscriptions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No subscriptions yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {showClient && <TableHead>Client</TableHead>}
            <TableHead>Package</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Next due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.map((sub) => (
            <TableRow key={sub.id}>
              {showClient && (
                <TableCell className="font-medium">
                  {sub.clients ? (
                    <Link
                      href={`/clients/${sub.clients.id}`}
                      className="hover:underline"
                    >
                      {sub.clients.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
              )}
              <TableCell>{sub.name}</TableCell>
              <TableCell>{formatCurrency(sub.amount, sub.currency)}</TableCell>
              <TableCell className="capitalize text-muted-foreground">
                {sub.frequency}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(sub.next_due_date)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={sub.status} />
                  {sub.auto_billing && (
                    <Badge
                      variant="outline"
                      title="Safepay charges the saved card automatically"
                    >
                      Auto
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <AutoBillingButton
                    subscriptionId={sub.id}
                    subscriptionName={sub.name}
                    clientName={sub.clients?.name ?? "there"}
                    clientPhone={sub.clients?.phone ?? null}
                    autoBilling={sub.auto_billing}
                  />
                  <SubscriptionFormDialog
                    clientId={sub.client_id}
                    subscription={sub}
                  />
                  <DeleteConfirmButton
                    title={`Delete ${sub.name}?`}
                    description="Past invoices for this subscription are kept, but no new invoices will be generated for it."
                    onDelete={() =>
                      deleteSubscriptionRecord(sub.id, sub.client_id)
                    }
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
