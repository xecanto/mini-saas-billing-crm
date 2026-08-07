"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { cancelInvoiceRecord, deleteInvoiceRecord } from "../actions";

export function InvoiceActions({
  invoiceId,
  clientId,
  canCancel,
}: {
  invoiceId: string;
  clientId: string;
  canCancel: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelInvoiceRecord(invoiceId, clientId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Invoice cancelled");
      router.refresh();
    });
  }

  return (
    <div className="flex gap-1">
      {canCancel && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <Ban className="size-4" />
              Cancel
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                The invoice will be marked cancelled and excluded from
                overdue reminders. This can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep invoice</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancel} disabled={isPending}>
                {isPending ? "Cancelling..." : "Cancel invoice"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <DeleteConfirmButton
        title="Delete this invoice?"
        description="This permanently removes the invoice and its payment history. This cannot be undone."
        onDelete={() => deleteInvoiceRecord(invoiceId, clientId)}
        redirectTo="/invoices"
      />
    </div>
  );
}
