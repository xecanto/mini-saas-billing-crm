import { z } from "zod";

export const invoiceSchema = z.object({
  client_id: z.uuid(),
  subscription_id: z.union([z.uuid(), z.literal("")]).optional(),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  due_date: z.string().min(1, "Due date is required"),
  notes: z.string().trim().optional(),
});

// A single charge outside any subscription: setup fee, extra work, or a
// one-time plan from the catalogue.
export const oneTimeChargeSchema = z.object({
  client_id: z.uuid(),
  plan_id: z.union([z.uuid(), z.literal("")]).nullish(),
  description: z.string().trim().min(1, "Describe what this charge is for"),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  due_date: z.string().min(1, "Due date is required"),
  send_email: z.coerce.boolean().default(true),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
export type InvoiceFormInput = z.input<typeof invoiceSchema>;
export type OneTimeChargeValues = z.infer<typeof oneTimeChargeSchema>;
export type OneTimeChargeInput = z.input<typeof oneTimeChargeSchema>;
