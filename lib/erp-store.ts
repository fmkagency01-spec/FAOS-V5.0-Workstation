import type {
  EmployeeRecord,
  ErpSyncEffects,
  InventoryRecord,
  InvoiceRecord,
  OrderRecord,
  OrderStatus,
  ProductRecord,
} from "@/lib/erp-types";
import {
  applyOrderSideEffectsLocal,
  ensureInventoryForProduct,
  restoreMap,
  snapshotMaps,
} from "@/lib/erp-sync";
import {
  emitIntelligenceEventLocal,
  emitOrderSyncEventsLocal,
  shouldEmitInventoryEvent,
  shouldEmitInvoiceEvent,
} from "@/lib/tac-events";

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

export type OrderWithSync = OrderRecord & { _sync?: ErpSyncEffects };
export type ProductWithSync = ProductRecord & {
  _sync?: { inventory: InventoryRecord };
};

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
    order_id: input.order_id || "",
    product_id: input.product_id || "",
    notes: input.notes?.trim(),
    created_at: ts,
    updated_at: ts,
  };
  invoices.set(record.id, record);
  if (shouldEmitInvoiceEvent(record.amount)) {
    void emitIntelligenceEventLocal(
      "high_value_invoice",
      {
        invoice_id: record.id,
        invoice_number: record.invoice_number,
        amount: record.amount,
        currency: record.currency,
        client_name: record.client_name,
        order_id: record.order_id,
      },
      "capital"
    );
  }
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
  if (shouldEmitInvoiceEvent(row.amount)) {
    void emitIntelligenceEventLocal(
      "high_value_invoice",
      {
        invoice_id: row.id,
        invoice_number: row.invoice_number,
        amount: row.amount,
        currency: row.currency,
        client_name: row.client_name,
        order_id: row.order_id,
      },
      "capital"
    );
  }
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
    product_id: input.product_id || "",
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
  if (shouldEmitInventoryEvent(delta, item.quantity, item.reorder_level)) {
    void emitIntelligenceEventLocal(
      "inventory_major_update",
      {
        inventory_id: item.id,
        sku: item.sku,
        name: item.name,
        delta,
        quantity: item.quantity,
        reorder_level: item.reorder_level,
      },
      "create"
    );
  }
  return item;
}

export function updateInventoryLocal(
  id: string,
  input: Partial<InventoryRecord>
): InventoryRecord | null {
  const row = inventory.get(id);
  if (!row) return null;
  const previousQty = row.quantity;
  Object.assign(row, input, { id, updated_at: now() });
  inventory.set(id, row);
  const delta = row.quantity - previousQty;
  if (shouldEmitInventoryEvent(delta, row.quantity, row.reorder_level)) {
    void emitIntelligenceEventLocal(
      "inventory_major_update",
      {
        inventory_id: row.id,
        sku: row.sku,
        name: row.name,
        delta,
        quantity: row.quantity,
        reorder_level: row.reorder_level,
      },
      "create"
    );
  }
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
  const previousStatus = row.status;
  Object.assign(row, input, { id, updated_at: now() });
  employees.set(id, row);
  if (previousStatus !== row.status && row.status === "terminated") {
    void emitIntelligenceEventLocal(
      "system_state_change",
      {
        message: `Employee ${row.name} marked terminated.`,
        employee_id: row.id,
        actions: ["Revoke system access", "Close open assignments"],
      },
      "capital"
    );
  }
  return row;
}

export function deleteEmployeeLocal(id: string): boolean {
  return employees.delete(id);
}

// --- Orders (atomic cross-module sync) ---

export function listOrdersLocal(): OrderRecord[] {
  return [...orders.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function getOrderLocal(id: string): OrderRecord | null {
  return orders.get(id) || null;
}

function runOrderTransaction(
  mutate: () => { order: OrderRecord; effects: ErpSyncEffects; previousStatus: OrderStatus | null }
): OrderWithSync {
  const snapOrders = snapshotMaps(orders);
  const snapInventory = snapshotMaps(inventory);
  const snapInvoices = snapshotMaps(invoices);
  try {
    return mutate().order as OrderWithSync;
  } catch (err) {
    restoreMap(orders, snapOrders);
    restoreMap(inventory, snapInventory);
    restoreMap(invoices, snapInvoices);
    throw err;
  }
}

export function createOrderLocal(input: Partial<OrderRecord>): OrderWithSync {
  const result = runOrderTransaction(() => {
    const ts = now();
    const quantity = input.quantity ?? 1;
    let unitPrice = input.unit_price ?? 0;
    let productName = input.product_name?.trim() || "";
    const productId = input.product_id || "";

    if (productId) {
      const product = products.get(productId);
      if (product) {
        if (!productName) productName = product.name;
        if (!unitPrice) unitPrice = product.unit_price;
      }
    }

    const record: OrderRecord = {
      id: uid("ord"),
      order_number: input.order_number || `ORD-${Date.now().toString(36).toUpperCase()}`,
      client_id: input.client_id || "",
      client_name: input.client_name?.trim() || "Client",
      product_id: productId,
      product_name: productName,
      quantity,
      unit_price: unitPrice,
      total: input.total ?? quantity * unitPrice,
      currency: input.currency || "USD",
      status: input.status || "pending",
      notes: input.notes?.trim(),
      invoice_id: "",
      inventory_id: "",
      inventory_adjusted: false,
      created_at: ts,
      updated_at: ts,
    };

    const effects = applyOrderSideEffectsLocal(
      { inventory, invoices, products },
      record,
      null
    );
    orders.set(record.id, record);
    const withSync: OrderWithSync = { ...record, _sync: effects };
    return { order: withSync, effects, previousStatus: null };
  });

  const effects = result._sync;
  if (effects) {
    void emitOrderSyncEventsLocal(result, effects, result.status === "cancelled").then(
      (ids) => {
        effects.tac_log_ids = ids;
      }
    );
  }
  return result;
}

export function updateOrderLocal(
  id: string,
  input: Partial<OrderRecord>
): OrderWithSync | null {
  if (!orders.get(id)) return null;

  let previousStatus: OrderStatus | null = null;
  const result = runOrderTransaction(() => {
    const row = orders.get(id);
    if (!row) throw new Error(`Order not found: ${id}`);
    previousStatus = row.status;
    Object.assign(row, input, { id, updated_at: now() });
    if (input.quantity != null || input.unit_price != null) {
      row.total = row.quantity * row.unit_price;
    }
    const effects = applyOrderSideEffectsLocal(
      { inventory, invoices, products },
      row,
      previousStatus
    );
    orders.set(id, row);
    const withSync: OrderWithSync = { ...row, _sync: effects };
    return { order: withSync, effects, previousStatus };
  });

  const effects = result._sync;
  if (effects) {
    const cancelled =
      previousStatus !== "cancelled" && result.status === "cancelled";
    void emitOrderSyncEventsLocal(result, effects, cancelled).then((ids) => {
      effects.tac_log_ids = ids;
    });
  }
  return result;
}

export function deleteOrderLocal(id: string): boolean {
  const row = orders.get(id);
  if (!row) return false;
  if (
    row.inventory_adjusted &&
    (row.status === "confirmed" || row.status === "fulfilled")
  ) {
    try {
      runOrderTransaction(() => {
        const order = orders.get(id);
        if (!order) throw new Error(`Order not found: ${id}`);
        const effects = applyOrderSideEffectsLocal(
          { inventory, invoices, products },
          { ...order, status: "cancelled" },
          order.status
        );
        orders.delete(id);
        return {
          order: order,
          effects,
          previousStatus: order.status,
        };
      });
      return true;
    } catch {
      return false;
    }
  }
  return orders.delete(id);
}

// --- Products ---

export function listProductsLocal(): ProductRecord[] {
  return [...products.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function getProductLocal(id: string): ProductRecord | null {
  return products.get(id) || null;
}

export function createProductLocal(input: Partial<ProductRecord>): ProductWithSync {
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
  const inv = ensureInventoryForProduct(inventory, record);
  return { ...record, _sync: { inventory: { ...inv } } };
}

export function updateProductLocal(
  id: string,
  input: Partial<ProductRecord>
): ProductWithSync | null {
  const row = products.get(id);
  if (!row) return null;
  Object.assign(row, input, { id, updated_at: now() });
  products.set(id, row);
  const inv = ensureInventoryForProduct(inventory, row);
  return { ...row, _sync: { inventory: { ...inv } } };
}

export function deleteProductLocal(id: string): boolean {
  return products.delete(id);
}

export function erpModuleCountsLocal() {
  return {
    invoices: invoices.size,
    inventory: inventory.size,
    employees: employees.size,
    orders: orders.size,
    products: products.size,
  };
}
