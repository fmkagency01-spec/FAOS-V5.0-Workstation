import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(80),
  password: z.string().min(1, "Password is required").max(200),
});

export const orderCreateSchema = z.object({
  order_number: z.string().trim().max(64).optional(),
  client_id: z.string().trim().max(80).optional().default(""),
  client_name: z.string().trim().min(1, "client_name is required").max(200),
  product_id: z.string().trim().max(80).optional().default(""),
  product_name: z.string().trim().max(200).optional().default(""),
  quantity: z.coerce.number().int().min(1).default(1),
  unit_price: z.coerce.number().min(0).default(0),
  total: z.coerce.number().min(0).optional(),
  currency: z.string().trim().min(3).max(8).default("USD"),
  status: z.enum(["pending", "confirmed", "fulfilled", "cancelled"]).default("pending"),
  notes: z.string().trim().max(2000).optional(),
});

export const orderUpdateSchema = orderCreateSchema.partial();

export const productCreateSchema = z.object({
  sku: z.string().trim().max(64).optional(),
  name: z.string().trim().min(1, "name is required").max(200),
  category: z.string().trim().max(120).default("General"),
  description: z.string().trim().max(4000).default(""),
  unit_price: z.coerce.number().min(0).default(0),
  currency: z.string().trim().min(3).max(8).default("USD"),
  active: z.boolean().default(true),
  brand_agent: z.string().trim().max(120).optional(),
});

export const productUpdateSchema = productCreateSchema.partial();

export const invoiceCreateSchema = z.object({
  client_id: z.string().trim().max(80).optional().default(""),
  client_name: z.string().trim().min(1).max(200),
  invoice_number: z.string().trim().max(64).optional(),
  amount: z.coerce.number().min(0).default(0),
  currency: z.string().trim().min(3).max(8).default("USD"),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).default("draft"),
  due_date: z.string().trim().max(32).optional(),
  notes: z.string().trim().max(2000).optional(),
  line_items: z
    .array(
      z.object({
        description: z.string(),
        qty: z.number(),
        unit_price: z.number(),
      })
    )
    .optional()
    .default([]),
});

export const invoiceUpdateSchema = invoiceCreateSchema.partial();

export const clientCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  industry: z.string().trim().max(120).optional(),
  contact_email: z.string().trim().email().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
  assigned_agent: z.string().trim().max(120).optional(),
});

export const notifySchema = z.object({
  to: z.array(z.string().email()).min(1),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10000),
  template: z.string().trim().max(80).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
