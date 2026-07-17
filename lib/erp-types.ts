export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export type InvoiceRecord = {
  id: string;
  client_id: string;
  client_name: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  due_date: string;
  line_items: Array<{ description: string; qty: number; unit_price: number }>;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type InventoryRecord = {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  reorder_level: number;
  unit_cost: number;
  location: string;
  brand_agent?: string;
  created_at: string;
  updated_at: string;
};

export type EmployeeStatus = "active" | "on_leave" | "terminated";

export type EmployeeRecord = {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone?: string;
  status: EmployeeStatus;
  hire_date: string;
  salary?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
};
