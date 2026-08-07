"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

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
  serviceSchema,
  type ServiceFormValues,
  type ServiceFormInput,
} from "@/lib/validations/service";
import type { Service } from "@/types/database";
import { createServiceRecord, updateServiceRecord } from "./actions";

export function ServiceFormDialog({ service }: { service?: Service }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEdit = !!service;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormInput, unknown, ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name ?? "",
      description: service?.description ?? "",
      website_url: service?.website_url ?? "",
      status: service?.status ?? "active",
      sort_order: service?.sort_order ?? 0,
    },
  });

  async function onSubmit(values: ServiceFormValues) {
    const result = isEdit
      ? await updateServiceRecord(service.id, values)
      : await createServiceRecord(values);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Service updated" : "Service added");
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
        {isEdit ? (
          <Button variant="ghost" size="icon" title="Edit service">
            <Pencil />
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus className="size-4" />
            New service
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit service" : "New service"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Service name</FieldLabel>
              <Input id="name" placeholder="POS Software" {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                rows={2}
                placeholder="Point-of-sale software for retail shops."
                {...register("description")}
              />
              <FieldError errors={[errors.description]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="website_url">Website</FieldLabel>
              <Input
                id="website_url"
                placeholder="https://goheer.dev"
                {...register("website_url")}
              />
              <p className="text-xs text-muted-foreground">
                Which of your sites sells this. Used to group revenue by
                property.
              </p>
              <FieldError errors={[errors.website_url]} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.status]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="sort_order">Display order</FieldLabel>
                <Input
                  id="sort_order"
                  type="number"
                  min="0"
                  {...register("sort_order")}
                />
                <FieldError errors={[errors.sort_order]} />
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : isEdit
                  ? "Save changes"
                  : "Add service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
