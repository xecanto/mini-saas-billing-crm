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
import { clientSchema, type ClientFormValues } from "@/lib/validations/client";
import type { Client } from "@/types/database";
import { createClientRecord, updateClientRecord } from "./actions";

export function ClientFormDialog({ client }: { client?: Client }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEdit = !!client;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name ?? "",
      phone: client?.phone ?? "",
      email: client?.email ?? "",
      company: client?.company ?? "",
      service_type: client?.service_type ?? "",
      notes: client?.notes ?? "",
      status: client?.status ?? "active",
    },
  });

  async function onSubmit(values: ClientFormValues) {
    const result = isEdit
      ? await updateClientRecord(client.id, values)
      : await createClientRecord(values);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Client updated" : "Client added");
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
          <Button variant="ghost" size="sm" className="gap-2">
            <Pencil className="size-4" />
            Edit
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus className="size-4" />
            New Client
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit client" : "New client"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input id="name" {...register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Phone (WhatsApp)</FieldLabel>
                <Input id="phone" placeholder="03001234567" {...register("phone")} />
                <FieldError errors={[errors.phone]} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" {...register("email")} />
                <FieldError errors={[errors.email]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="company">Company</FieldLabel>
                <Input id="company" {...register("company")} />
                <FieldError errors={[errors.company]} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="service_type">Service type</FieldLabel>
                <Input
                  id="service_type"
                  placeholder="POS, CMS, Hosting..."
                  {...register("service_type")}
                />
                <FieldError errors={[errors.service_type]} />
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
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.status]} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea id="notes" rows={3} {...register("notes")} />
              <FieldError errors={[errors.notes]} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Add client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
