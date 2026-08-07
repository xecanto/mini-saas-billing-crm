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
import { ClientFormDialog } from "./client-form-dialog";
import { deleteClientRecord } from "./actions";
import type { Client } from "@/types/database";

export function ClientsTable({ clients }: { clients: Client[] }) {
  if (clients.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No clients yet. Add your first client to get started.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/clients/${client.id}`}
                  className="hover:underline"
                >
                  {client.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {client.company || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {client.service_type || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {client.phone}
              </TableCell>
              <TableCell>
                <StatusBadge status={client.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <ClientFormDialog client={client} />
                  <DeleteConfirmButton
                    title={`Delete ${client.name}?`}
                    description="This also deletes all of their subscriptions, invoices, and payment history. This cannot be undone."
                    onDelete={() => deleteClientRecord(client.id)}
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
