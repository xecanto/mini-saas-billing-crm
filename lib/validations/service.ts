import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional().or(z.literal("")),
  website_url: z
    .string()
    .trim()
    .url("Must be a full URL, e.g. https://goheer.dev")
    .optional()
    .or(z.literal("")),
  status: z.enum(["active", "inactive"]),
  sort_order: z.coerce.number().int().min(0).default(0),
});

export const planSchema = z.object({
  service_id: z.uuid(),
  name: z.string().trim().min(1, "Name is required"),
  billing_period: z.enum(["monthly", "quarterly", "yearly", "one_time"]),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  currency: z.string().trim().min(1).default("PKR"),
  description: z.string().trim().optional().or(z.literal("")),
  // Entered one per line in the form; other sites render these on pricing pages.
  features: z
    .union([z.string(), z.array(z.string())])
    .transform((value) =>
      (Array.isArray(value) ? value : value.split("\n"))
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .default([]),
  status: z.enum(["active", "inactive"]),
  is_public: z.coerce.boolean().default(true),
  sort_order: z.coerce.number().int().min(0).default(0),
});

export const apiKeySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  scopes: z.array(z.enum(["read", "checkout"])).min(1, "Pick at least one scope"),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;
export type ServiceFormInput = z.input<typeof serviceSchema>;
export type PlanFormValues = z.infer<typeof planSchema>;
export type PlanFormInput = z.input<typeof planSchema>;
