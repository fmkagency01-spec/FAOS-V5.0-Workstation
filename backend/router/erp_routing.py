"""FAOS v5.3 — ERP modules: Invoicing, Inventory, HR, Orders, Products (Render persistence)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from middleware.validation import optional_float, optional_int, require_str

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "faos_erp_db.json"

DEFAULT_DB = {
    "invoices": [],
    "inventory": [],
    "employees": [],
    "orders": [],
    "products": [],
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def _load() -> Dict[str, Any]:
    if not DATA_PATH.exists():
        return dict(DEFAULT_DB)
    with DATA_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)
    for key, default in DEFAULT_DB.items():
        data.setdefault(key, list(default))
    return data


def _save(data: Dict[str, Any]) -> None:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DATA_PATH.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def _find(collection: List[Dict[str, Any]], record_id: str) -> Optional[Dict[str, Any]]:
    for row in collection:
        if row.get("id") == record_id:
            return row
    return None


def _remove(collection: List[Dict[str, Any]], record_id: str) -> bool:
    for idx, row in enumerate(collection):
        if row.get("id") == record_id:
            collection.pop(idx)
            return True
    return False


class ErpOrchestrator:
    # --- Invoices ---

    def list_invoices(self) -> List[Dict[str, Any]]:
        return sorted(_load()["invoices"], key=lambda x: x.get("updated_at", ""), reverse=True)

    def get_invoice(self, record_id: str) -> Dict[str, Any]:
        row = _find(_load()["invoices"], record_id)
        if not row:
            raise ValueError(f"Invoice not found: {record_id}")
        return row

    def create_invoice(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = _load()
        ts = _now()
        record = {
            "id": _uid("inv"),
            "client_id": payload.get("client_id") or "",
            "client_name": require_str(payload, "client_name", "Client"),
            "invoice_number": payload.get("invoice_number") or f"INV-{uuid.uuid4().hex[:8].upper()}",
            "amount": optional_float(payload, "amount", 0),
            "currency": payload.get("currency") or "USD",
            "status": payload.get("status") or "draft",
            "due_date": payload.get("due_date") or ts[:10],
            "line_items": payload.get("line_items") or [],
            "notes": payload.get("notes"),
            "created_at": ts,
            "updated_at": ts,
        }
        data["invoices"].append(record)
        _save(data)
        return record

    def update_invoice(self, record_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = _load()
        row = _find(data["invoices"], record_id)
        if not row:
            raise ValueError(f"Invoice not found: {record_id}")
        for field in ("client_name", "status", "notes", "currency", "due_date"):
            if field in payload and payload[field] is not None:
                row[field] = payload[field]
        if "amount" in payload:
            row["amount"] = optional_float(payload, "amount", row.get("amount", 0))
        if "line_items" in payload:
            row["line_items"] = payload["line_items"]
        row["updated_at"] = _now()
        _save(data)
        return row

    def delete_invoice(self, record_id: str) -> bool:
        data = _load()
        if not _remove(data["invoices"], record_id):
            raise ValueError(f"Invoice not found: {record_id}")
        _save(data)
        return True

    # --- Inventory ---

    def list_inventory(self) -> List[Dict[str, Any]]:
        return sorted(_load()["inventory"], key=lambda x: x.get("updated_at", ""), reverse=True)

    def get_inventory(self, record_id: str) -> Dict[str, Any]:
        row = _find(_load()["inventory"], record_id)
        if not row:
            raise ValueError(f"Inventory item not found: {record_id}")
        return row

    def create_inventory(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = _load()
        ts = _now()
        record = {
            "id": _uid("sku"),
            "sku": (payload.get("sku") or f"SKU-{uuid.uuid4().hex[:6].upper()}").strip(),
            "name": require_str(payload, "name", "Product"),
            "category": (payload.get("category") or "General").strip(),
            "quantity": optional_int(payload, "quantity", 0),
            "reorder_level": optional_int(payload, "reorder_level", 10),
            "unit_cost": optional_float(payload, "unit_cost", 0),
            "location": (payload.get("location") or "Main Warehouse").strip(),
            "brand_agent": payload.get("brand_agent"),
            "created_at": ts,
            "updated_at": ts,
        }
        data["inventory"].append(record)
        _save(data)
        return record

    def adjust_stock(self, item_id: str, delta: int) -> Dict[str, Any]:
        data = _load()
        row = _find(data["inventory"], item_id)
        if not row:
            raise ValueError(f"Inventory item not found: {item_id}")
        row["quantity"] = max(0, int(row.get("quantity", 0)) + delta)
        row["updated_at"] = _now()
        _save(data)
        return row

    def update_inventory(self, record_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = _load()
        row = _find(data["inventory"], record_id)
        if not row:
            raise ValueError(f"Inventory item not found: {record_id}")
        for field in ("name", "category", "location", "brand_agent", "sku"):
            if field in payload and payload[field] is not None:
                row[field] = str(payload[field]).strip()
        if "quantity" in payload:
            row["quantity"] = optional_int(payload, "quantity", row.get("quantity", 0))
        if "reorder_level" in payload:
            row["reorder_level"] = optional_int(payload, "reorder_level", row.get("reorder_level", 10))
        if "unit_cost" in payload:
            row["unit_cost"] = optional_float(payload, "unit_cost", row.get("unit_cost", 0))
        row["updated_at"] = _now()
        _save(data)
        return row

    def delete_inventory(self, record_id: str) -> bool:
        data = _load()
        if not _remove(data["inventory"], record_id):
            raise ValueError(f"Inventory item not found: {record_id}")
        _save(data)
        return True

    # --- HR ---

    def list_employees(self) -> List[Dict[str, Any]]:
        return sorted(_load()["employees"], key=lambda x: x.get("updated_at", ""), reverse=True)

    def get_employee(self, record_id: str) -> Dict[str, Any]:
        row = _find(_load()["employees"], record_id)
        if not row:
            raise ValueError(f"Employee not found: {record_id}")
        return row

    def create_employee(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = _load()
        ts = _now()
        record = {
            "id": _uid("emp"),
            "name": require_str(payload, "name", "Employee"),
            "role": (payload.get("role") or "Staff").strip(),
            "department": (payload.get("department") or "General").strip(),
            "email": (payload.get("email") or "").strip(),
            "phone": payload.get("phone"),
            "status": payload.get("status") or "active",
            "hire_date": payload.get("hire_date") or ts[:10],
            "salary": payload.get("salary"),
            "notes": payload.get("notes"),
            "created_at": ts,
            "updated_at": ts,
        }
        data["employees"].append(record)
        _save(data)
        return record

    def update_employee(self, record_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = _load()
        row = _find(data["employees"], record_id)
        if not row:
            raise ValueError(f"Employee not found: {record_id}")
        for field in ("name", "role", "department", "email", "phone", "status", "notes", "hire_date"):
            if field in payload and payload[field] is not None:
                row[field] = payload[field]
        if "salary" in payload:
            row["salary"] = payload["salary"]
        row["updated_at"] = _now()
        _save(data)
        return row

    def delete_employee(self, record_id: str) -> bool:
        data = _load()
        if not _remove(data["employees"], record_id):
            raise ValueError(f"Employee not found: {record_id}")
        _save(data)
        return True

    # --- Orders ---

    def list_orders(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        rows = _load()["orders"]
        if status:
            rows = [o for o in rows if o.get("status") == status]
        return sorted(rows, key=lambda x: x.get("updated_at", ""), reverse=True)

    def get_order(self, record_id: str) -> Dict[str, Any]:
        row = _find(_load()["orders"], record_id)
        if not row:
            raise ValueError(f"Order not found: {record_id}")
        return row

    def create_order(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = _load()
        ts = _now()
        record = {
            "id": _uid("ord"),
            "order_number": payload.get("order_number") or f"ORD-{uuid.uuid4().hex[:8].upper()}",
            "client_id": payload.get("client_id") or "",
            "client_name": require_str(payload, "client_name", "Client"),
            "product_id": payload.get("product_id") or "",
            "product_name": (payload.get("product_name") or "").strip(),
            "quantity": optional_int(payload, "quantity", 1),
            "unit_price": optional_float(payload, "unit_price", 0),
            "total": optional_float(payload, "total", 0),
            "currency": payload.get("currency") or "USD",
            "status": payload.get("status") or "pending",
            "notes": payload.get("notes"),
            "created_at": ts,
            "updated_at": ts,
        }
        if record["total"] == 0:
            record["total"] = round(record["quantity"] * record["unit_price"], 2)
        data["orders"].append(record)
        _save(data)
        return record

    def update_order(self, record_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = _load()
        row = _find(data["orders"], record_id)
        if not row:
            raise ValueError(f"Order not found: {record_id}")
        for field in ("client_name", "product_name", "status", "notes", "currency", "client_id", "product_id"):
            if field in payload and payload[field] is not None:
                row[field] = payload[field]
        if "quantity" in payload:
            row["quantity"] = optional_int(payload, "quantity", row.get("quantity", 1))
        if "unit_price" in payload:
            row["unit_price"] = optional_float(payload, "unit_price", row.get("unit_price", 0))
        if "total" in payload:
            row["total"] = optional_float(payload, "total", row.get("total", 0))
        elif "quantity" in payload or "unit_price" in payload:
            row["total"] = round(row.get("quantity", 1) * row.get("unit_price", 0), 2)
        row["updated_at"] = _now()
        _save(data)
        return row

    def delete_order(self, record_id: str) -> bool:
        data = _load()
        if not _remove(data["orders"], record_id):
            raise ValueError(f"Order not found: {record_id}")
        _save(data)
        return True

    # --- Products (catalog) ---

    def list_products(self) -> List[Dict[str, Any]]:
        return sorted(_load()["products"], key=lambda x: x.get("updated_at", ""), reverse=True)

    def get_product(self, record_id: str) -> Dict[str, Any]:
        row = _find(_load()["products"], record_id)
        if not row:
            raise ValueError(f"Product not found: {record_id}")
        return row

    def create_product(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = _load()
        ts = _now()
        record = {
            "id": _uid("prod"),
            "sku": (payload.get("sku") or f"PROD-{uuid.uuid4().hex[:6].upper()}").strip(),
            "name": require_str(payload, "name", "Product"),
            "category": (payload.get("category") or "General").strip(),
            "description": (payload.get("description") or "").strip(),
            "unit_price": optional_float(payload, "unit_price", 0),
            "currency": payload.get("currency") or "USD",
            "active": payload.get("active", True),
            "brand_agent": payload.get("brand_agent"),
            "created_at": ts,
            "updated_at": ts,
        }
        data["products"].append(record)
        _save(data)
        return record

    def update_product(self, record_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = _load()
        row = _find(data["products"], record_id)
        if not row:
            raise ValueError(f"Product not found: {record_id}")
        for field in ("name", "sku", "category", "description", "currency", "brand_agent"):
            if field in payload and payload[field] is not None:
                row[field] = payload[field]
        if "unit_price" in payload:
            row["unit_price"] = optional_float(payload, "unit_price", row.get("unit_price", 0))
        if "active" in payload:
            row["active"] = bool(payload["active"])
        row["updated_at"] = _now()
        _save(data)
        return row

    def delete_product(self, record_id: str) -> bool:
        data = _load()
        if not _remove(data["products"], record_id):
            raise ValueError(f"Product not found: {record_id}")
        _save(data)
        return True


erp = ErpOrchestrator()
