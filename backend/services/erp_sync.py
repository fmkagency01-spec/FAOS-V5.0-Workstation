"""Cross-module ERP synchronization: Orders ↔ Inventory ↔ Invoicing."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from services.tac_events import (
    emit_intelligence_event,
    should_emit_inventory_event,
    should_emit_invoice_event,
)

FINALIZING_STATUSES = {"confirmed", "fulfilled"}
CANCELLED_STATUS = "cancelled"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def find_inventory_for_order(
    inventory: List[Dict[str, Any]],
    products: List[Dict[str, Any]],
    order: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    product_id = (order.get("product_id") or "").strip()
    product_name = (order.get("product_name") or "").strip().lower()

    if product_id:
        for row in inventory:
            if row.get("product_id") == product_id or row.get("id") == product_id:
                return row

    product: Optional[Dict[str, Any]] = None
    if product_id:
        for p in products:
            if p.get("id") == product_id:
                product = p
                break
    if not product and product_name:
        for p in products:
            if (p.get("name") or "").strip().lower() == product_name:
                product = p
                break

    if product:
        sku = (product.get("sku") or "").strip().lower()
        for row in inventory:
            if row.get("product_id") == product.get("id"):
                return row
            if sku and (row.get("sku") or "").strip().lower() == sku:
                return row
            if (row.get("name") or "").strip().lower() == (product.get("name") or "").strip().lower():
                return row

    if product_name:
        for row in inventory:
            if (row.get("name") or "").strip().lower() == product_name:
                return row
    return None


def find_invoice_for_order(
    invoices: List[Dict[str, Any]], order_id: str
) -> Optional[Dict[str, Any]]:
    for inv in invoices:
        if inv.get("order_id") == order_id:
            return inv
    return None


def ensure_inventory_for_product(
    data: Dict[str, Any], product: Dict[str, Any]
) -> Dict[str, Any]:
    """Ensure a linked inventory row exists for a catalog product (qty preserved if present)."""
    inventory = data["inventory"]
    for row in inventory:
        if row.get("product_id") == product["id"]:
            row["sku"] = product.get("sku") or row.get("sku")
            row["name"] = product.get("name") or row.get("name")
            row["category"] = product.get("category") or row.get("category")
            row["unit_cost"] = product.get("unit_price", row.get("unit_cost", 0))
            row["updated_at"] = _now()
            return row
        if (row.get("sku") or "").strip().lower() == (product.get("sku") or "").strip().lower():
            row["product_id"] = product["id"]
            row["name"] = product.get("name") or row.get("name")
            row["updated_at"] = _now()
            return row

    ts = _now()
    record = {
        "id": _uid("sku"),
        "product_id": product["id"],
        "sku": product.get("sku") or f"SKU-{uuid.uuid4().hex[:6].upper()}",
        "name": product.get("name") or "Product",
        "category": product.get("category") or "General",
        "quantity": 0,
        "reorder_level": 10,
        "unit_cost": float(product.get("unit_price") or 0),
        "location": "Main Warehouse",
        "brand_agent": product.get("brand_agent"),
        "created_at": ts,
        "updated_at": ts,
    }
    inventory.append(record)
    return record


def _build_invoice_from_order(order: Dict[str, Any], existing: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    ts = _now()
    line_items = [
        {
            "description": order.get("product_name") or "Order line",
            "qty": int(order.get("quantity") or 1),
            "unit_price": float(order.get("unit_price") or 0),
        }
    ]
    amount = float(order.get("total") or 0)
    if existing:
        existing.update(
            {
                "client_id": order.get("client_id") or existing.get("client_id") or "",
                "client_name": order.get("client_name") or existing.get("client_name"),
                "amount": amount,
                "currency": order.get("currency") or existing.get("currency") or "USD",
                "status": "sent" if existing.get("status") == "cancelled" else existing.get("status") or "draft",
                "line_items": line_items,
                "order_id": order["id"],
                "product_id": order.get("product_id") or "",
                "notes": existing.get("notes")
                or f"Auto-generated from order {order.get('order_number')}",
                "updated_at": ts,
            }
        )
        return existing

    return {
        "id": _uid("inv"),
        "client_id": order.get("client_id") or "",
        "client_name": order.get("client_name") or "Client",
        "invoice_number": f"INV-{uuid.uuid4().hex[:8].upper()}",
        "amount": amount,
        "currency": order.get("currency") or "USD",
        "status": "draft",
        "due_date": ts[:10],
        "line_items": line_items,
        "order_id": order["id"],
        "product_id": order.get("product_id") or "",
        "notes": f"Auto-generated from order {order.get('order_number')}",
        "created_at": ts,
        "updated_at": ts,
    }


def apply_order_side_effects(
    data: Dict[str, Any],
    order: Dict[str, Any],
    previous_status: Optional[str],
) -> Dict[str, Any]:
    """Mutate inventory + invoices for an order status transition (in-memory)."""
    effects: Dict[str, Any] = {
        "inventory": None,
        "invoice": None,
        "events": [],
        "stock_adjusted": False,
        "invoice_mutated": False,
    }
    new_status = order.get("status") or "pending"
    qty = int(order.get("quantity") or 0)

    entering_final = new_status in FINALIZING_STATUSES and previous_status not in FINALIZING_STATUSES
    leaving_final = (
        previous_status in FINALIZING_STATUSES
        and new_status == CANCELLED_STATUS
        and bool(order.get("inventory_adjusted"))
    )

    if entering_final and not order.get("inventory_adjusted"):
        item = find_inventory_for_order(data["inventory"], data["products"], order)
        if not item:
            raise ValueError(
                "Cannot finalize order: no inventory item linked to product "
                f"'{order.get('product_name') or order.get('product_id') or 'unknown'}'. "
                "Create a product/inventory link first."
            )
        available = int(item.get("quantity") or 0)
        if available < qty:
            raise ValueError(
                f"Insufficient stock for order finalize: need {qty}, have {available} "
                f"(SKU {item.get('sku')})."
            )
        item["quantity"] = available - qty
        item["updated_at"] = _now()
        order["inventory_adjusted"] = True
        order["inventory_id"] = item["id"]
        effects["inventory"] = dict(item)
        effects["stock_adjusted"] = True
        effects["events"].append(
            {
                "type": "inventory_decrement",
                "inventory_id": item["id"],
                "delta": -qty,
            }
        )

        invoice = find_invoice_for_order(data["invoices"], order["id"])
        invoice = _build_invoice_from_order(order, invoice)
        if not find_invoice_for_order(data["invoices"], order["id"]):
            data["invoices"].append(invoice)
        order["invoice_id"] = invoice["id"]
        effects["invoice"] = dict(invoice)
        effects["invoice_mutated"] = True
        effects["events"].append(
            {
                "type": "invoice_upsert",
                "invoice_id": invoice["id"],
            }
        )

    elif leaving_final:
        inv_id = order.get("inventory_id")
        item = None
        if inv_id:
            for row in data["inventory"]:
                if row.get("id") == inv_id:
                    item = row
                    break
        if not item:
            item = find_inventory_for_order(data["inventory"], data["products"], order)
        if item:
            item["quantity"] = int(item.get("quantity") or 0) + qty
            item["updated_at"] = _now()
            effects["inventory"] = dict(item)
            effects["stock_adjusted"] = True
            effects["events"].append(
                {
                    "type": "inventory_restore",
                    "inventory_id": item["id"],
                    "delta": qty,
                }
            )
        order["inventory_adjusted"] = False

        invoice = find_invoice_for_order(data["invoices"], order["id"])
        if invoice:
            invoice["status"] = "cancelled"
            invoice["updated_at"] = _now()
            effects["invoice"] = dict(invoice)
            effects["invoice_mutated"] = True
            effects["events"].append(
                {
                    "type": "invoice_cancel",
                    "invoice_id": invoice["id"],
                }
            )

    return effects


def emit_post_commit_events(
    order: Dict[str, Any],
    effects: Dict[str, Any],
    *,
    cancelled: bool = False,
) -> List[Dict[str, Any]]:
    """Fire TAC intelligence after a successful transactional commit."""
    logs: List[Dict[str, Any]] = []
    if not effects.get("stock_adjusted") and not effects.get("invoice_mutated"):
        return logs

    payload = {
        "order_id": order.get("id"),
        "order_number": order.get("order_number"),
        "client_name": order.get("client_name"),
        "product_name": order.get("product_name"),
        "quantity": order.get("quantity"),
        "total": order.get("total"),
        "currency": order.get("currency"),
        "status": order.get("status"),
        "invoice_id": order.get("invoice_id"),
        "inventory_id": order.get("inventory_id"),
    }
    event_type = "order_cancelled" if cancelled else "order_finalized"
    pillar = "capital" if cancelled else "create"
    logs.append(emit_intelligence_event(event_type, payload, pillar_id=pillar))

    inv = effects.get("invoice")
    if inv and should_emit_invoice_event(float(inv.get("amount") or 0)):
        logs.append(
            emit_intelligence_event(
                "high_value_invoice",
                {
                    "invoice_id": inv.get("id"),
                    "invoice_number": inv.get("invoice_number"),
                    "amount": inv.get("amount"),
                    "currency": inv.get("currency"),
                    "client_name": inv.get("client_name"),
                    "order_id": order.get("id"),
                },
                pillar_id="capital",
            )
        )

    stock = effects.get("inventory")
    if stock and effects.get("stock_adjusted"):
        delta = 0
        for ev in effects.get("events") or []:
            if ev.get("type", "").startswith("inventory"):
                delta = int(ev.get("delta") or 0)
        if should_emit_inventory_event(
            delta, int(stock.get("quantity") or 0), int(stock.get("reorder_level") or 0)
        ):
            logs.append(
                emit_intelligence_event(
                    "inventory_major_update",
                    {
                        "inventory_id": stock.get("id"),
                        "sku": stock.get("sku"),
                        "name": stock.get("name"),
                        "delta": delta,
                        "quantity": stock.get("quantity"),
                        "reorder_level": stock.get("reorder_level"),
                        "order_id": order.get("id"),
                    },
                    pillar_id="create",
                )
            )
    return logs
