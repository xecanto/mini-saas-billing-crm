import { z } from "zod";

export const subscriptionSchema = z.object({
  client_id: z.uuid(),
  // Optional so bespoke arrangements can still exist outside the catalogue.
  plan_id: z.uuid().nullish().or(z.literal("")),
  name: z.string().trim().min(1, "Name is required"),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  currency: z.string().trim().min(1).default("PKR"),
  frequency: z.enum(["monthly", "quarterly", "yearly"]),
  next_due_date: z.string().min(1, "Due date is required"),
  status: z.enum(["active", "paused", "cancelled"]),
});

export type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;
export type SubscriptionFormInput = z.input<typeof subscriptionSchema>;
