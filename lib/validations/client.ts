import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(7, "Enter a valid phone number"),
  email: z.union([z.email("Invalid email"), z.literal("")]).optional(),
  company: z.string().trim().optional(),
  service_type: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
