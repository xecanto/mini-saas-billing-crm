"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createOneTimeCharge } from "../../invoices/actions";

export type OneTimePlanOption = {
  id: string;
  label: string;
  amount: number;
};

const CUSTOM = "custom";

export function OneTimeChargeDialog({
  clientId,
  clientHasEmail,
  plans,
}: {
  clientId: string;
  clientHasEmail: boolean;
  plans: OneTimePlanOption[];
}) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState<string>(CUSTOM);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(() =>
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  );
  const [sendEmail, setSendEmail] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function reset() {
    setPlanId(CUSTOM);
    setDescription("");
    setAmount("");
    setSendEmail(true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Zap className="size-4" />
          One-time charge
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>One-time charge</DialogTitle>
          <DialogDescription>
            Bill this client once, with no subscription. Creates an invoice they
            can pay by card, JazzCash or Easypaisa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {plans.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="plan">Charge for</Label>
              <Select
                value={planId}
                onValueChange={(value) => {
                  setPlanId(value);
                  const plan = plans.find((p) => p.id === value);
                  if (plan) {
                    setAmount(String(plan.amount));
                    setDescription(plan.label);
                  }
                }}
              >
                <SelectTrigger id="plan" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CUSTOM}>Custom amount</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="charge-description">Description</Label>
            <Textarea
              id="charge-description"
              rows={2}
              placeholder="POS terminal setup and on-site training"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Appears on the invoice and in the email.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="charge-amount">Amount (PKR)</Label>
              <Input
                id="charge-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="charge-due">Due date</Label>
              <Input
                id="charge-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            disabled={!clientHasEmail}
            onClick={() => setSendEmail((v) => !v)}
            className={`flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors disabled:opacity-50 ${
              sendEmail && clientHasEmail ? "border-primary bg-muted" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={sendEmail && clientHasEmail}
              readOnly
              className="mt-0.5"
            />
            <span>
              Email the payment request now
              {!clientHasEmail && (
                <span className="block text-xs text-muted-foreground">
                  This client has no email address on file.
                </span>
              )}
            </span>
          </button>
        </div>

        <DialogFooter>
          <Button
            disabled={saving || !description.trim() || !amount}
            onClick={async () => {
              setSaving(true);
              const result = await createOneTimeCharge({
                client_id: clientId,
                plan_id: planId === CUSTOM ? null : planId,
                description,
                amount: Number(amount),
                due_date: dueDate,
                send_email: sendEmail && clientHasEmail,
              });
              setSaving(false);

              if (result.error) {
                toast.error(result.error);
                return;
              }
              if (result.emailWarning) {
                toast.warning(
                  `${result.invoiceNumber} created, but the email failed: ${result.emailWarning}`,
                );
              } else {
                toast.success(
                  sendEmail && clientHasEmail
                    ? `${result.invoiceNumber} created and emailed`
                    : `${result.invoiceNumber} created`,
                );
              }
              setOpen(false);
              reset();
              router.refresh();
            }}
          >
            {saving ? "Creating…" : "Create charge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
