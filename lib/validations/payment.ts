import { z } from "zod";

export const paymentSchema = z.object({
  invoice_id: z.uuid(),
  gateway: z.enum([
    "cash",
    "bank_transfer",
    "jazzcash",
    "easypaisa",
    "card",
    "manual",
    "other",
  ]),
  transaction_id: z.string().trim().optional(),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  paid_at: z.string().min(1, "Payment date is required"),
  notes: z.string().trim().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;
export type PaymentFormInput = z.input<typeof paymentSchema>;
