/**
 * Cross-module ERP synchronization for the Vercel in-memory fallback store.
 * Mirrors backend/services/erp_sync.py — Orders ↔ Inventory ↔ Invoicing.
 */

import type {
  ErpSyncEffects,
  InventoryRecord,
  InvoiceRecord,
  OrderRecord,
  OrderStatus,
  ProductRecord,
} from "@/lib/erp-types";

const FINALIZING = new Set<OrderStatus>(["confirmed", "fulfilled"]);

function now() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function findInventoryForOrder(
  inventory: InventoryRecord[],
  products: ProductRecord[],
  order: OrderRecord
): InventoryRecord | null {
  const productId = order.product_id?.trim() || "";
  const productName = (order.product_name || "").trim().toLowerCase();

  if (productId) {
    const byProduct = inventory.find(
      (row) => row.product_id === productId || row.id === productId
    );
    if (byProduct) return byProduct;
  }

  let product =
    (productId && products.find((p) => p.id === productId)) ||
    (productName
      ? products.find((p) => p.name.trim().toLowerCase() === productName)
      : undefined);

  if (product) {
    const sku = product.sku.trim().toLowerCase();
    const linked = inventory.find(
      (row) =>
        row.product_id === product!.id ||
        (sku && row.sku.trim().toLowerCase() === sku) ||
        row.name.trim().toLowerCase() === product!.name.trim().toLowerCase()
    );
    if (linked) return linked;
  }

  if (productName) {
    return inventory.find((row) => row.name.trim().toLowerCase() === productName) || null;
  }
  return null;
}

export function findInvoiceForOrder(
  invoices: InvoiceRecord[],
  orderId: string
): InvoiceRecord | null {
  return invoices.find((inv) => inv.order_id === orderId) || null;
}

export function ensureInventoryForProduct(
  inventory: Map<string, InventoryRecord>,
  product: ProductRecord
): InventoryRecord {
  for (const row of inventory.values()) {
    if (row.product_id === product.id) {
      row.sku = product.sku || row.sku;
      row.name = product.name || row.name;
      row.category = product.category || row.category;
      row.unit_cost = product.unit_price ?? row.unit_cost;
      row.updated_at = now();
      inventory.set(row.id, row);
      return row;
    }
    if (row.sku.trim().toLowerCase() === product.sku.trim().toLowerCase()) {
      row.product_id = product.id;
      row.name = product.name || row.name;
      row.updated_at = now();
      inventory.set(row.id, row);
      return row;
    }
  }

  const ts = now();
  const record: InventoryRecord = {
    id: uid("sku"),
    product_id: product.id,
    sku: product.sku || `SKU-${Date.now().toString(36).toUpperCase()}`,
    name: product.name,
    category: product.category || "General",
    quantity: 0,
    reorder_level: 10,
    unit_cost: product.unit_price ?? 0,
    location: "Main Warehouse",
    brand_agent: product.brand_agent,
    created_at: ts,
    updated_at: ts,
  };
  inventory.set(record.id, record);
  return record;
}

function buildInvoiceFromOrder(
  order: OrderRecord,
  existing: InvoiceRecord | null
): InvoiceRecord {
  const ts = now();
  const line_items = [
    {
      description: order.product_name || "Order line",
      qty: order.quantity,
      unit_price: order.unit_price,
    },
  ];

  if (existing) {
    Object.assign(existing, {
      client_id: order.client_id || existing.client_id,
      client_name: order.client_name || existing.client_name,
      amount: order.total,
      currency: order.currency || existing.currency,
      status:
        existing.status === "cancelled" ? "sent" : existing.status || "draft",
      line_items,
      order_id: order.id,
      product_id: order.product_id || "",
      notes: existing.notes || `Auto-generated from order ${order.order_number}`,
      updated_at: ts,
    });
    return existing;
  }

  return {
    id: uid("inv"),
    client_id: order.client_id || "",
    client_name: order.client_name || "Client",
    invoice_number: `INV-${Date.now().toString(36).toUpperCase()}`,
    amount: order.total,
    currency: order.currency || "USD",
    status: "draft",
    due_date: ts.slice(0, 10),
    line_items,
    order_id: order.id,
    product_id: order.product_id || "",
    notes: `Auto-generated from order ${order.order_number}`,
    created_at: ts,
    updated_at: ts,
  };
}

export type SyncStores = {
  inventory: Map<string, InventoryRecord>;
  invoices: Map<string, InvoiceRecord>;
  products: Map<string, ProductRecord>;
};

/**
 * Apply inventory + invoice mutations for an order status transition.
 * Throws on insufficient stock / missing inventory so the caller can roll back.
 */
export function applyOrderSideEffectsLocal(
  stores: SyncStores,
  order: OrderRecord,
  previousStatus: OrderStatus | null
): ErpSyncEffects {
  const effects: ErpSyncEffects = {
    inventory: null,
    invoice: null,
    events: [],
    stock_adjusted: false,
    invoice_mutated: false,
  };

  const newStatus = order.status;
  const qty = order.quantity;
  const enteringFinal =
    FINALIZING.has(newStatus) &&
    !(previousStatus && FINALIZING.has(previousStatus));
  const leavingFinal =
    Boolean(previousStatus && FINALIZING.has(previousStatus)) &&
    newStatus === "cancelled" &&
    Boolean(order.inventory_adjusted);

  if (enteringFinal && !order.inventory_adjusted) {
    const item = findInventoryForOrder(
      [...stores.inventory.values()],
      [...stores.products.values()],
      order
    );
    if (!item) {
      throw new Error(
        `Cannot finalize order: no inventory item linked to product '${order.product_name || order.product_id || "unknown"}'. Create a product/inventory link first.`
      );
    }
    if (item.quantity < qty) {
      throw new Error(
        `Insufficient stock for order finalize: need ${qty}, have ${item.quantity} (SKU ${item.sku}).`
      );
    }
    item.quantity -= qty;
    item.updated_at = now();
    stores.inventory.set(item.id, item);
    order.inventory_adjusted = true;
    order.inventory_id = item.id;
    effects.inventory = { ...item };
    effects.stock_adjusted = true;
    effects.events.push({
      type: "inventory_decrement",
      inventory_id: item.id,
      delta: -qty,
    });

    const existing = findInvoiceForOrder([...stores.invoices.values()], order.id);
    const invoice = buildInvoiceFromOrder(order, existing);
    stores.invoices.set(invoice.id, invoice);
    order.invoice_id = invoice.id;
    effects.invoice = { ...invoice };
    effects.invoice_mutated = true;
    effects.events.push({ type: "invoice_upsert", invoice_id: invoice.id });
  } else if (leavingFinal) {
    let item =
      (order.inventory_id && stores.inventory.get(order.inventory_id)) ||
      findInventoryForOrder(
        [...stores.inventory.values()],
        [...stores.products.values()],
        order
      );
    if (item) {
      item.quantity += qty;
      item.updated_at = now();
      stores.inventory.set(item.id, item);
      effects.inventory = { ...item };
      effects.stock_adjusted = true;
      effects.events.push({
        type: "inventory_restore",
        inventory_id: item.id,
        delta: qty,
      });
    }
    order.inventory_adjusted = false;

    const invoice = findInvoiceForOrder([...stores.invoices.values()], order.id);
    if (invoice) {
      invoice.status = "cancelled";
      invoice.updated_at = now();
      stores.invoices.set(invoice.id, invoice);
      effects.invoice = { ...invoice };
      effects.invoice_mutated = true;
      effects.events.push({ type: "invoice_cancel", invoice_id: invoice.id });
    }
  }

  return effects;
}

/** Snapshot maps for rollback if a multi-step local mutation fails mid-flight. */
export function snapshotMaps<T extends { id: string }>(
  map: Map<string, T>
): Map<string, T> {
  return new Map([...map.entries()].map(([k, v]) => [k, { ...v }]));
}

export function restoreMap<T extends { id: string }>(
  target: Map<string, T>,
  snapshot: Map<string, T>
) {
  target.clear();
  for (const [k, v] of snapshot) target.set(k, v);
}
