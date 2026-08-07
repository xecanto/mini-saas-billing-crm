"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { addDays, format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ClientCombobox, type ClientOption } from "@/components/client-combobox";
import {
  invoiceSchema,
  type InvoiceFormValues,
  type InvoiceFormInput,
} from "@/lib/validations/invoice";
import type { Subscription } from "@/types/database";
import { createInvoiceRecord } from "../actions";

export function InvoiceForm({
  clients,
  subscriptions,
  defaultClientId,
}: {
  clients: ClientOption[];
  subscriptions: Subscription[];
  defaultClientId?: string;
}) {
  const router = useRouter();
  const today = format(new Date(), "yyyy-MM-dd");
  const defaultDue = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormInput, unknown, InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      client_id: defaultClientId ?? "",
      subscription_id: "",
      amount: 0,
      invoice_date: today,
      due_date: defaultDue,
      notes: "",
    },
  });

  const selectedClientId = watch("client_id");
  const clientSubscriptions = useMemo(
    () =>
      subscriptions.filter(
        (s) => s.client_id === selectedClientId && s.status === "active",
      ),
    [subscriptions, selectedClientId],
  );

  async function onSubmit(values: InvoiceFormValues) {
    const result = await createInvoiceRecord(values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Invoice created");
    router.push(`/invoices/${result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-6">
      <FieldGroup>
        <Field>
          <FieldLabel>Client</FieldLabel>
          <Controller
            control={control}
            name="client_id"
            render={({ field }) => (
              <ClientCombobox
                clients={clients}
                value={field.value}
                onChange={(id) => {
                  field.onChange(id);
                  setValue("subscription_id", "");
                }}
              />
            )}
          />
          <FieldError errors={[errors.client_id]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="subscription_id">
            Link to subscription (optional)
          </FieldLabel>
          <Controller
            control={control}
            name="subscription_id"
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(v) => {
                  const value = v === "none" ? "" : v;
                  field.onChange(value);
                  const sub = clientSubscriptions.find((s) => s.id === value);
                  if (sub) setValue("amount", sub.amount);
                }}
                disabled={!selectedClientId}
              >
                <SelectTrigger id="subscription_id" className="w-full">
                  <SelectValue placeholder="No subscription (custom invoice)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Custom (no subscription)</SelectItem>
                  {clientSubscriptions.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.subscription_id]} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="amount">Amount (PKR)</FieldLabel>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              {...register("amount")}
            />
            <FieldError errors={[errors.amount]} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="invoice_date">Invoice date</FieldLabel>
            <Input id="invoice_date" type="date" {...register("invoice_date")} />
            <FieldError errors={[errors.invoice_date]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="due_date">Due date</FieldLabel>
            <Input id="due_date" type="date" {...register("due_date")} />
            <FieldError errors={[errors.due_date]} />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <Textarea id="notes" rows={3} {...register("notes")} />
          <FieldError errors={[errors.notes]} />
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create invoice"}
      </Button>
    </form>
  );
}
