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
  order_id: z.string().trim().max(80).optional().default(""),
  product_id: z.string().trim().max(80).optional().default(""),
  notes: z.string().trim().max(2000).optional(),
  line_items: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(500),
        qty: z.coerce.number().min(0),
        unit_price: z.coerce.number().min(0),
      })
    )
    .optional()
    .default([]),
});

export const invoiceUpdateSchema = invoiceCreateSchema.partial();

export const inventoryCreateSchema = z.object({
  sku: z.string().trim().max(64).optional(),
  product_id: z.string().trim().max(80).optional().default(""),
  name: z.string().trim().min(1, "name is required").max(200),
  category: z.string().trim().max(120).default("General"),
  quantity: z.coerce.number().int().min(0).default(0),
  reorder_level: z.coerce.number().int().min(0).default(10),
  unit_cost: z.coerce.number().min(0).default(0),
  location: z.string().trim().max(200).default("Main Warehouse"),
  brand_agent: z.string().trim().max(120).optional(),
});

export const inventoryUpdateSchema = inventoryCreateSchema.partial().extend({
  delta: z.coerce.number().int().optional(),
  id: z.string().trim().max(80).optional(),
});

export const employeeCreateSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(200),
  role: z.string().trim().max(120).default("Staff"),
  department: z.string().trim().max(120).default("General"),
  email: z.string().trim().max(200).default(""),
  phone: z.string().trim().max(40).optional(),
  status: z.enum(["active", "on_leave", "terminated"]).default("active"),
  hire_date: z.string().trim().max(32).optional(),
  salary: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const employeeUpdateSchema = employeeCreateSchema.partial();

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

export const tacIntelligenceEmitSchema = z.object({
  event_type: z.string().trim().min(1).max(80).default("system_state_change"),
  pillar_id: z.string().trim().max(40).optional().default("capital"),
  payload: z.record(z.string(), z.unknown()).optional(),
  message: z.string().trim().max(2000).optional(),
  actions: z.array(z.string().trim().max(200)).max(5).optional(),
});

const workLogInProgressSchema = z.object({
  name: z.string().trim().min(1).max(200),
  progress_pct: z.coerce.number().min(0).max(100).default(0),
});

export const workLogCreateSchema = z.object({
  log_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "log_date must be YYYY-MM-DD")
    .optional(),
  member_name: z.string().trim().min(1, "member_name is required").max(200),
  member_role: z.string().trim().max(120).optional().default("Team"),
  submitted_by: z.string().trim().max(120).optional(),
  tasks_completed: z.array(z.string().trim().min(1).max(500)).max(20).optional().default([]),
  tasks_in_progress: z.array(workLogInProgressSchema).max(20).optional().default([]),
  blockers: z.array(z.string().trim().min(1).max(500)).max(20).optional().default([]),
  next_day_plan: z.array(z.string().trim().min(1).max(500)).max(20).optional().default([]),
  project_health: z.enum(["on_track", "at_risk", "blocked"]).optional().default("on_track"),
  backend_notes: z.string().trim().max(4000).optional(),
  agent_activity_ids: z.array(z.string().trim().min(1).max(80)).max(50).optional().default([]),
});

export const workLogUpdateSchema = workLogCreateSchema.partial();

export type LoginInput = z.infer<typeof loginSchema>;
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type InventoryCreateInput = z.infer<typeof inventoryCreateSchema>;
export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type WorkLogCreateInput = z.infer<typeof workLogCreateSchema>;
