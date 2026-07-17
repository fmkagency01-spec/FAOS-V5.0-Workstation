import type { EmployeeRecord, InventoryRecord, InvoiceRecord } from "@/lib/erp-types";

const invoices = new Map<string, InvoiceRecord>();
const inventory = new Map<string, InventoryRecord>();
const employees = new Map<string, EmployeeRecord>();

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

// --- Inventory ---

export function listInventoryLocal(): InventoryRecord[] {
  return [...inventory.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
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

// --- HR ---

export function listEmployeesLocal(): EmployeeRecord[] {
  return [...employees.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
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
