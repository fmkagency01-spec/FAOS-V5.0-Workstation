import type {
  EmployeeRecord,
  InventoryRecord,
  InvoiceRecord,
  OrderRecord,
  ProductRecord,
} from "@/lib/erp-types";

const invoices = new Map<string, InvoiceRecord>();
const inventory = new Map<string, InventoryRecord>();
const employees = new Map<string, EmployeeRecord>();
const orders = new Map<string, OrderRecord>();
const products = new Map<string, ProductRecord>();

function now() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// --- Invoices ---

export function listInvoicesLocal(): InvoiceRecord[] {
  return [...invoices.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function getInvoiceLocal(id: string): InvoiceRecord | null {
  return invoices.get(id) || null;
}

export function createInvoiceLocal(input: Partial<InvoiceRecord>): InvoiceRecord {
  const ts = now();
  const record: InvoiceRecord = {
    id: uid("inv"),
    client_id: input.client_id || "",
    client_name: input.client_name?.trim() || "Client",
    invoice_number: input.invoice_number || `INV-${Date.now().toString(36).toUpperCase()}`,
    amount: input.amount ?? 0,
    currency: input.currency || "USD",
    status: input.status || "draft",
    due_date: input.due_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    line_items: input.line_items || [],
    notes: input.notes?.trim(),
    created_at: ts,
    updated_at: ts,
  };
  invoices.set(record.id, record);
  return record;
}

export function updateInvoiceLocal(
  id: string,
  input: Partial<InvoiceRecord>
): InvoiceRecord | null {
  const row = invoices.get(id);
  if (!row) return null;
  Object.assign(row, input, { id, updated_at: now() });
  invoices.set(id, row);
  return row;
}

export function deleteInvoiceLocal(id: string): boolean {
  return invoices.delete(id);
}

// --- Inventory ---

export function listInventoryLocal(): InventoryRecord[] {
  return [...inventory.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function getInventoryLocal(id: string): InventoryRecord | null {
  return inventory.get(id) || null;
}

export function createInventoryLocal(input: Partial<InventoryRecord>): InventoryRecord {
  const ts = now();
  const record: InventoryRecord = {
    id: uid("sku"),
    sku: input.sku?.trim() || `SKU-${Date.now().toString(36).toUpperCase()}`,
    name: input.name?.trim() || "Product",
    category: input.category?.trim() || "General",
    quantity: input.quantity ?? 0,
    reorder_level: input.reorder_level ?? 10,
    unit_cost: input.unit_cost ?? 0,
    location: input.location?.trim() || "Main Warehouse",
    brand_agent: input.brand_agent,
    created_at: ts,
    updated_at: ts,
  };
  inventory.set(record.id, record);
  return record;
}

export function adjustStockLocal(id: string, delta: number): InventoryRecord | null {
  const item = inventory.get(id);
  if (!item) return null;
  item.quantity = Math.max(0, item.quantity + delta);
  item.updated_at = now();
  inventory.set(id, item);
  return item;
}

export function updateInventoryLocal(
  id: string,
  input: Partial<InventoryRecord>
): InventoryRecord | null {
  const row = inventory.get(id);
  if (!row) return null;
  Object.assign(row, input, { id, updated_at: now() });
  inventory.set(id, row);
  return row;
}

export function deleteInventoryLocal(id: string): boolean {
  return inventory.delete(id);
}

// --- HR ---

export function listEmployeesLocal(): EmployeeRecord[] {
  return [...employees.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function getEmployeeLocal(id: string): EmployeeRecord | null {
  return employees.get(id) || null;
}

export function createEmployeeLocal(input: Partial<EmployeeRecord>): EmployeeRecord {
  const ts = now();
  const record: EmployeeRecord = {
    id: uid("emp"),
    name: input.name?.trim() || "Employee",
    role: input.role?.trim() || "Staff",
    department: input.department?.trim() || "General",
    email: input.email?.trim() || "",
    phone: input.phone?.trim(),
    status: input.status || "active",
    hire_date: input.hire_date || ts.slice(0, 10),
    salary: input.salary,
    notes: input.notes?.trim(),
    created_at: ts,
    updated_at: ts,
  };
  employees.set(record.id, record);
  return record;
}

export function updateEmployeeLocal(
  id: string,
  input: Partial<EmployeeRecord>
): EmployeeRecord | null {
  const row = employees.get(id);
  if (!row) return null;
  Object.assign(row, input, { id, updated_at: now() });
  employees.set(id, row);
  return row;
}

export function deleteEmployeeLocal(id: string): boolean {
  return employees.delete(id);
}

// --- Orders ---

export function listOrdersLocal(): OrderRecord[] {
  return [...orders.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function getOrderLocal(id: string): OrderRecord | null {
  return orders.get(id) || null;
}

export function createOrderLocal(input: Partial<OrderRecord>): OrderRecord {
  const ts = now();
  const quantity = input.quantity ?? 1;
  const unitPrice = input.unit_price ?? 0;
  const record: OrderRecord = {
    id: uid("ord"),
    order_number: input.order_number || `ORD-${Date.now().toString(36).toUpperCase()}`,
    client_id: input.client_id || "",
    client_name: input.client_name?.trim() || "Client",
    product_id: input.product_id || "",
    product_name: input.product_name?.trim() || "",
    quantity,
    unit_price: unitPrice,
    total: input.total ?? quantity * unitPrice,
    currency: input.currency || "USD",
    status: input.status || "pending",
    notes: input.notes?.trim(),
    created_at: ts,
    updated_at: ts,
  };
  orders.set(record.id, record);
  return record;
}

export function updateOrderLocal(id: string, input: Partial<OrderRecord>): OrderRecord | null {
  const row = orders.get(id);
  if (!row) return null;
  Object.assign(row, input, { id, updated_at: now() });
  if (input.quantity != null || input.unit_price != null) {
    row.total = row.quantity * row.unit_price;
  }
  orders.set(id, row);
  return row;
}

export function deleteOrderLocal(id: string): boolean {
  return orders.delete(id);
}

// --- Products ---

export function listProductsLocal(): ProductRecord[] {
  return [...products.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function getProductLocal(id: string): ProductRecord | null {
  return products.get(id) || null;
}

export function createProductLocal(input: Partial<ProductRecord>): ProductRecord {
  const ts = now();
  const record: ProductRecord = {
    id: uid("prod"),
    sku: input.sku?.trim() || `PROD-${Date.now().toString(36).toUpperCase()}`,
    name: input.name?.trim() || "Product",
    category: input.category?.trim() || "General",
    description: input.description?.trim() || "",
    unit_price: input.unit_price ?? 0,
    currency: input.currency || "USD",
    active: input.active ?? true,
    brand_agent: input.brand_agent,
    created_at: ts,
    updated_at: ts,
  };
  products.set(record.id, record);
  return record;
}

export function updateProductLocal(
  id: string,
  input: Partial<ProductRecord>
): ProductRecord | null {
  const row = products.get(id);
  if (!row) return null;
  Object.assign(row, input, { id, updated_at: now() });
  products.set(id, row);
  return row;
}

export function deleteProductLocal(id: string): boolean {
  return products.delete(id);
}
