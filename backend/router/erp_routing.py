"""FAOS v5.1 — ERP modules: Invoicing, Inventory, HR (Render persistence)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "faos_erp_db.json"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def _load() -> Dict[str, Any]:
    if not DATA_PATH.exists():
        return {"invoices": [], "inventory": [], "employees": []}
    with DATA_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def _save(data: Dict[str, Any]) -> None:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DATA_PATH.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


class ErpOrchestrator:
    # --- Invoices ---

    def list_invoices(self) -> List[Dict[str, Any]]:
        return sorted(_load()["invoices"], key=lambda x: x.get("updated_at", ""), reverse=True)

    def create_invoice(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = _load()
        ts = _now()
        record = {
            "id": _uid("inv"),
            "client_id": payload.get("client_id") or "",
            "client_name": (payload.get("client_name") or "Client").strip(),
            "invoice_number": payload.get("invoice_number") or f"INV-{uuid.uuid4().hex[:8].upper()}",
            "amount": float(payload.get("amount") or 0),
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

    # --- Inventory ---

    def list_inventory(self) -> List[Dict[str, Any]]:
        return sorted(_load()["inventory"], key=lambda x: x.get("updated_at", ""), reverse=True)

    def create_inventory(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = _load()
        ts = _now()
        record = {
            "id": _uid("sku"),
            "sku": (payload.get("sku") or f"SKU-{uuid.uuid4().hex[:6].upper()}").strip(),
            "name": (payload.get("name") or "Product").strip(),
            "category": (payload.get("category") or "General").strip(),
            "quantity": int(payload.get("quantity") or 0),
            "reorder_level": int(payload.get("reorder_level") or 10),
            "unit_cost": float(payload.get("unit_cost") or 0),
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
        for item in data["inventory"]:
            if item["id"] == item_id:
                item["quantity"] = max(0, int(item.get("quantity", 0)) + delta)
                item["updated_at"] = _now()
                _save(data)
                return item
        raise ValueError(f"Inventory item not found: {item_id}")

    # --- HR ---

    def list_employees(self) -> List[Dict[str, Any]]:
        return sorted(_load()["employees"], key=lambda x: x.get("updated_at", ""), reverse=True)

    def create_employee(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = _load()
        ts = _now()
        record = {
            "id": _uid("emp"),
            "name": (payload.get("name") or "Employee").strip(),
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


erp = ErpOrchestrator()
