"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  planSchema,
  type PlanFormValues,
  type PlanFormInput,
} from "@/lib/validations/service";
import type { Plan } from "@/types/database";
import {
  createPlanRecord,
  previewPlanPriceChange,
  updatePlanRecord,
} from "./actions";

type PricePreview = Awaited<ReturnType<typeof previewPlanPriceChange>>;

export function PlanFormDialog({
  serviceId,
  plan,
}: {
  serviceId: string;
  plan?: Plan;
}) {
  const [open, setOpen] = useState(false);
  // Holds the pending save while we ask what to do about existing subscribers.
  const [preview, setPreview] = useState<PricePreview | null>(null);
  const [pendingValues, setPendingValues] = useState<PlanFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const isEdit = !!plan;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlanFormInput, unknown, PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      service_id: serviceId,
      name: plan?.name ?? "",
      billing_period: plan?.billing_period ?? "monthly",
      amount: plan?.amount ?? 0,
      currency: plan?.currency ?? "PKR",
      description: plan?.description ?? "",
      features: plan?.features?.join("\n") ?? "",
      status: plan?.status ?? "active",
      is_public: plan?.is_public ?? true,
      sort_order: plan?.sort_order ?? 0,
    },
  });

  function close() {
    setOpen(false);
    setPreview(null);
    setPendingValues(null);
    if (!isEdit) reset();
  }

  async function save(
    values: PlanFormValues,
    options: { applyToExisting: boolean; notifyClients: boolean },
  ) {
    setSaving(true);
    const result = await updatePlanRecord(plan!.id, values, options);
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.warnings?.length) {
      // Local rows saved but Safepay or the emails did not - you need to know.
      for (const w of result.warnings) toast.warning(w);
    } else {
      toast.success("Plan updated");
    }
    close();
    router.refresh();
  }

  async function onSubmit(values: PlanFormValues) {
    if (!isEdit) {
      const result = await createPlanRecord(values);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Plan added");
      close();
      router.refresh();
      return;
    }

    // Editing: if the price moved and anyone is on this plan, ask first.
    const check = await previewPlanPriceChange(plan.id, values.amount);
    if (!check.error && check.changed && (check.willChange ?? 0) > 0) {
      setPendingValues(values);
      setPreview(check);
      return;
    }

    await save(values, { applyToExisting: false, notifyClients: false });
  }

  // ---- price change confirmation step ----
  if (preview && pendingValues) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && close()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="size-5 text-amber-600" />
              This price change affects existing clients
            </DialogTitle>
            <DialogDescription>
              {preview.oldAmount} → {preview.newAmount}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-md border p-3">
              <p>
                <strong>{preview.willChange}</strong> of {preview.total}{" "}
                subscriber{preview.total === 1 ? "" : "s"} would move to the new
                price
                {(preview.autoBilled ?? 0) > 0 && (
                  <>
                    , including <strong>{preview.autoBilled}</strong> whose card
                    is charged automatically
                  </>
                )}
                .
              </p>
              {(preview.customPriced ?? 0) > 0 && (
                <p className="mt-2 text-muted-foreground">
                  {preview.customPriced} client
                  {preview.customPriced === 1 ? " is" : "s are"} on a negotiated
                  price and will be left alone.
                </p>
              )}
              {preview.names && preview.names.length > 0 && (
                <p className="mt-2 text-muted-foreground">
                  {preview.names.join(", ")}
                  {(preview.willChange ?? 0) > preview.names.length && " …"}
                </p>
              )}
            </div>

            <p className="text-muted-foreground">
              Pushing the change updates Safepay too, so auto-billed cards are
              charged the new amount from their next cycle.
            </p>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              disabled={saving}
              onClick={() =>
                save(pendingValues, {
                  applyToExisting: false,
                  notifyClients: false,
                })
              }
            >
              New clients only
            </Button>
            <Button
              disabled={saving}
              onClick={() =>
                save(pendingValues, {
                  applyToExisting: true,
                  notifyClients: true,
                })
              }
            >
              {saving ? "Applying…" : "Apply to everyone & email them"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) close();
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" title="Edit plan">
            <Pencil />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="size-4" />
            Add plan
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit plan" : "New plan"}</DialogTitle>
          <DialogDescription>
            One plan per price point. A service with monthly and annual pricing
            has two plans.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="plan-name">Plan name</FieldLabel>
                <Input id="plan-name" placeholder="Pro" {...register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="billing_period">Billing</FieldLabel>
                <Controller
                  control={control}
                  name="billing_period"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="billing_period" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Annual</SelectItem>
                        <SelectItem value="one_time">One-time</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.billing_period]} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="plan-amount">Amount (PKR)</FieldLabel>
              <Input
                id="plan-amount"
                type="number"
                step="0.01"
                min="0"
                {...register("amount")}
              />
              <FieldError errors={[errors.amount]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="plan-description">Description</FieldLabel>
              <Textarea
                id="plan-description"
                rows={2}
                placeholder="Everything in Basic, plus multi-branch support."
                {...register("description")}
              />
              <FieldError errors={[errors.description]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="features">Features</FieldLabel>
              <Textarea
                id="features"
                rows={4}
                placeholder={"Unlimited invoices\nMulti-branch\nPriority support"}
                {...register("features")}
              />
              <p className="text-xs text-muted-foreground">
                One per line. Your other websites can pull these for pricing
                pages.
              </p>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="plan-status">Status</FieldLabel>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="plan-status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="is_public">Visible to websites</FieldLabel>
                <Controller
                  control={control}
                  name="is_public"
                  render={({ field }) => (
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(v === "true")}
                    >
                      <SelectTrigger id="is_public" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Public</SelectItem>
                        <SelectItem value="false">Internal only</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Add plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
