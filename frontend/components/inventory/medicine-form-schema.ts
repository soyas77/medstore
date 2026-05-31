import { z } from "zod";

export const medicineFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  manufacturer: z.string().min(2, "Manufacturer is required"),
  price_per_strip: z.coerce
    .number({ invalid_type_error: "Price must be a number" })
    .min(0, "Price cannot be negative"),
  stock: z.coerce
    .number({ invalid_type_error: "Stock must be a number" })
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative"),
  low_stock_threshold: z.coerce
    .number({ invalid_type_error: "Threshold must be a number" })
    .int("Threshold must be a whole number")
    .min(0, "Threshold cannot be negative"),
  batch_number: z.string().optional().or(z.literal("")),
  expiry_date: z.string().optional().or(z.literal("")),
});

export type MedicineFormValues = z.infer<typeof medicineFormSchema>;
