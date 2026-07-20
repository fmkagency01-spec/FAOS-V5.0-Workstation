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
  order_id?: string;
  product_id?: string;
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
  product_id?: string;
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

export type OrderStatus = "pending" | "confirmed" | "fulfilled" | "cancelled";

export type OrderRecord = {
  id: string;
  order_number: string;
  client_id: string;
  client_name: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  currency: string;
  status: OrderStatus;
  notes?: string;
  invoice_id?: string;
  inventory_id?: string;
  inventory_adjusted?: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductRecord = {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  unit_price: number;
  currency: string;
  active: boolean;
  brand_agent?: string;
  created_at: string;
  updated_at: string;
};

export type ErpSyncEffects = {
  inventory: InventoryRecord | null;
  invoice: InvoiceRecord | null;
  events: Array<{ type: string; inventory_id?: string; invoice_id?: string; delta?: number }>;
  stock_adjusted: boolean;
  invoice_mutated: boolean;
  tac_log_ids?: string[];
};
