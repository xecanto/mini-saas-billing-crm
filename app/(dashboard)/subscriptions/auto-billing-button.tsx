"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Loader2, Repeat, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import {
  cancelSafepayAutoBilling,
  createSafepaySubscriptionLink,
} from "./actions";

/**
 * Auto-billing is opt-in per subscription and needs the client to enter card
 * details themselves, so the merchant's job is to hand them a link. We generate
 * it, then let them copy it or fire it straight into WhatsApp.
 */
export function AutoBillingButton({
  subscriptionId,
  subscriptionName,
  clientName,
  clientPhone,
  autoBilling,
}: {
  subscriptionId: string;
  subscriptionName: string;
  clientName: string;
  clientPhone: string | null;
  autoBilling: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  if (autoBilling) {
    return (
      <Button
        variant="ghost"
        size="icon"
        title="Stop Safepay auto-billing"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await cancelSafepayAutoBilling(subscriptionId);
            if (result.error) toast.error(result.error);
            else toast.success("Auto-billing stopped. Manual invoicing resumes.");
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : <X />}
      </Button>
    );
  }

  const message = `Assalam o Alaikum ${clientName},

You can set up automatic payment for your ${subscriptionName} subscription here:
${url ?? ""}

You will only need to enter your card once.`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && !url) {
          startTransition(async () => {
            const result = await createSafepaySubscriptionLink(subscriptionId);
            if (result.error) {
              toast.error(result.error);
              setOpen(false);
            } else {
              setUrl(result.url ?? null);
            }
          });
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Set up Safepay auto-billing">
          <Repeat />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set up auto-billing</DialogTitle>
          <DialogDescription>
            Send this link to {clientName}. Once they save a card, Safepay
            charges {subscriptionName} automatically and this app stops issuing
            manual invoices for it.
          </DialogDescription>
        </DialogHeader>

        {pending || !url ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="animate-spin" />
            Creating the plan with Safepay…
          </div>
        ) : (
          <div className="flex gap-2">
            <Input readOnly value={url} className="font-mono text-xs" />
            <Button
              variant="outline"
              size="icon"
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
        )}

        <DialogFooter>
          {url && clientPhone && (
            <Button asChild>
              <a
                href={buildWhatsAppLink(clientPhone, message)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Send on WhatsApp
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
