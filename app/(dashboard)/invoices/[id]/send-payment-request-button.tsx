"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendInvoicePaymentRequest } from "../actions";

export function SendPaymentRequestButton({
  invoiceId,
  clientEmail,
  amount,
}: {
  invoiceId: string;
  clientEmail: string | null;
  amount: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  if (!clientEmail) {
    return (
      <Button variant="outline" disabled title="This client has no email address">
        <Send />
        Send payment request
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Send />
          Send payment request
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send payment request</DialogTitle>
          <DialogDescription>
            Emails {clientEmail} a branded request for {amount} with a button
            that opens Safepay checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="note">Personal note (optional)</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. As discussed, this covers the extra POS terminal for March."
          />
        </div>

        <DialogFooter>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await sendInvoicePaymentRequest(invoiceId, note);
                if (result.error) {
                  toast.error(result.error);
                } else {
                  toast.success(`Payment request sent to ${result.sentTo}`);
                  setOpen(false);
                  setNote("");
                }
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : <Send />}
            Send email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
