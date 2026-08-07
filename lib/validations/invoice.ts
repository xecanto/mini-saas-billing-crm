import { z } from "zod";

export const invoiceSchema = z.object({
  client_id: z.uuid(),
  subscription_id: z.union([z.uuid(), z.literal("")]).optional(),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  due_date: z.string().min(1, "Due date is required"),
  notes: z.string().trim().optional(),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
export type InvoiceFormInput = z.input<typeof invoiceSchema>;
