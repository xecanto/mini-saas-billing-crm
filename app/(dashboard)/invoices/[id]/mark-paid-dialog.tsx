"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  paymentSchema,
  type PaymentFormValues,
  type PaymentFormInput,
} from "@/lib/validations/payment";
import { markInvoicePaid } from "../actions";

const GATEWAYS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "Easypaisa" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
] as const;

export function MarkPaidDialog({
  invoiceId,
  amount,
}: {
  invoiceId: string;
  amount: number;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormInput, unknown, PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      invoice_id: invoiceId,
      gateway: "bank_transfer",
      transaction_id: "",
      amount,
      paid_at: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  });

  async function onSubmit(values: PaymentFormValues) {
    const result = await markInvoicePaid(invoiceId, values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Invoice marked as paid");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <CheckCircle2 className="size-4" />
          Mark as Paid
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="amount">Amount received (PKR)</FieldLabel>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("amount")}
                />
                <FieldError errors={[errors.amount]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="gateway">Payment method</FieldLabel>
                <Controller
                  control={control}
                  name="gateway"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="gateway" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GATEWAYS.map((g) => (
                          <SelectItem key={g.value} value={g.value}>
                            {g.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.gateway]} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="transaction_id">
                  Transaction ID (optional)
                </FieldLabel>
                <Input id="transaction_id" {...register("transaction_id")} />
                <FieldError errors={[errors.transaction_id]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="paid_at">Payment date</FieldLabel>
                <Input id="paid_at" type="date" {...register("paid_at")} />
                <FieldError errors={[errors.paid_at]} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea id="notes" rows={2} {...register("notes")} />
              <FieldError errors={[errors.notes]} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Confirm payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
