"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  subscriptionSchema,
  type SubscriptionFormValues,
  type SubscriptionFormInput,
} from "@/lib/validations/subscription";
import type { Subscription } from "@/types/database";
import {
  createSubscriptionRecord,
  updateSubscriptionRecord,
} from "./actions";

export type PlanOption = {
  id: string;
  label: string;
  amount: number;
  currency: string;
  billing_period: "monthly" | "quarterly" | "yearly";
};

const NO_PLAN = "none";

export function SubscriptionFormDialog({
  clientId,
  subscription,
  trigger,
  plans = [],
}: {
  clientId: string;
  subscription?: Subscription;
  trigger?: React.ReactNode;
  plans?: PlanOption[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEdit = !!subscription;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionFormInput, unknown, SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      client_id: clientId,
      plan_id: subscription?.plan_id ?? "",
      name: subscription?.name ?? "",
      amount: subscription?.amount ?? 0,
      currency: subscription?.currency ?? "PKR",
      frequency: subscription?.frequency ?? "monthly",
      next_due_date:
        subscription?.next_due_date ?? new Date().toISOString().slice(0, 10),
      status: subscription?.status ?? "active",
    },
  });

  const selectedPlanId = watch("plan_id");
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const amount = watch("amount");
  // Flagged on save so a plan-wide price change knows to leave this row alone.
  const isOverridden =
    !!selectedPlan && Number(amount) !== Number(selectedPlan.amount);

  async function onSubmit(values: SubscriptionFormValues) {
    const payload = { ...values, price_overridden: isOverridden };
    const result = isEdit
      ? await updateSubscriptionRecord(subscription.id, payload)
      : await createSubscriptionRecord(payload);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Subscription updated" : "Subscription added");
    setOpen(false);
    if (!isEdit) reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next && !isEdit) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ??
          (isEdit ? (
            <Button variant="ghost" size="sm" className="gap-2">
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : (
            <Button size="sm" className="gap-2">
              <Plus className="size-4" />
              New Subscription
            </Button>
          ))}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit subscription" : "New subscription"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            {plans.length > 0 && (
              <Field>
                <FieldLabel htmlFor="plan_id">Plan</FieldLabel>
                <Controller
                  control={control}
                  name="plan_id"
                  render={({ field }) => (
                    <Select
                      value={field.value || NO_PLAN}
                      onValueChange={(value) => {
                        const next = value === NO_PLAN ? "" : value;
                        field.onChange(next);
                        const plan = plans.find((p) => p.id === next);
                        if (plan) {
                          // Prefill from the catalogue; you can still edit both.
                          setValue("name", plan.label);
                          setValue("amount", plan.amount);
                          setValue("currency", plan.currency);
                          setValue("frequency", plan.billing_period);
                        }
                      }}
                    >
                      <SelectTrigger id="plan_id" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_PLAN}>
                          Custom (no plan)
                        </SelectItem>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Linking to a plan is what lets you see who is on what, and
                  push price changes later.
                </p>
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="name">Package name</FieldLabel>
              <Input
                id="name"
                placeholder="POS Package"
                {...register("name")}
              />
              <FieldError errors={[errors.name]} />
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
                {isOverridden && (
                  <p className="text-xs text-amber-600">
                    Custom price — plan price changes will skip this client.
                  </p>
                )}
                <FieldError errors={[errors.amount]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="frequency">Frequency</FieldLabel>
                <Controller
                  control={control}
                  name="frequency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="frequency" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.frequency]} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="next_due_date">Next due date</FieldLabel>
                <Input
                  id="next_due_date"
                  type="date"
                  {...register("next_due_date")}
                />
                <FieldError errors={[errors.next_due_date]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="status">Status</FieldLabel>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.status]} />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : isEdit
                  ? "Save changes"
                  : "Add subscription"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
