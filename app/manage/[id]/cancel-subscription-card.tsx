"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
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
import { cancelSubscriptionAsClient } from "./actions";

export function CancelSubscriptionCard({
  subscriptionId,
  planName,
  nextDueDate,
  autoBilling,
}: {
  subscriptionId: string;
  planName: string;
  nextDueDate: string;
  autoBilling: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className="rounded-md bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-400">
        Your subscription has been cancelled. You will not be charged again, and
        a confirmation is on its way to your inbox.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="rounded-md bg-muted p-3 text-muted-foreground">
        {autoBilling
          ? `Your card is charged automatically. Cancel before ${nextDueDate} and you will not be charged again.`
          : `You are invoiced manually each period. Cancelling stops any future invoices for ${planName}.`}
      </p>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="w-full" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Cancel subscription
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {planName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will stop and no further payments will be taken.
              This cannot be undone from here — you would need to contact us to
              start again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const result = await cancelSubscriptionAsClient(subscriptionId);
                  if (result.error) setError(result.error);
                  else setDone(true);
                })
              }
            >
              Yes, cancel it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
