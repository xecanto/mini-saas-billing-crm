"use client";

import { useState, useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startSafepayCheckout } from "./actions";

export function PayButton({
  invoiceId,
  amount,
}: {
  invoiceId: string;
  amount: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        size="lg"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            // On success this redirects to Safepay and never returns.
            const result = await startSafepayCheckout(invoiceId);
            if (result?.error) setError(result.error);
          });
        }}
      >
        {pending ? (
          <Loader2 className="animate-spin" />
        ) : (
          <CreditCard />
        )}
        {pending ? "Redirecting…" : `Pay ${amount}`}
      </Button>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Secured by Safepay — card, JazzCash and Easypaisa accepted.
      </p>
    </div>
  );
}
