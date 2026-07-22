"""FAOS v5.3 — ERP modules: Invoicing, Inventory, HR, Orders, Products (Render persistence).

Cross-module hooks: order finalize/cancel atomically updates Inventory + Invoicing
inside a JSON-file transaction, then emits TAC intelligence events.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from middleware.validation import optional_float, optional_int, require_str
from services.erp_sync import (
    apply_order_side_effects,
    emit_post_commit_events,
    ensure_inventory_for_product,
)
from services.erp_tx import load_db, run_transaction
from services.tac_events import (
    emit_intelligence_event,
    module_health_snapshot,
    should_emit_inventory_event,
    should_emit_invoice_event,
)

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "faos_erp_db.json"

DEFAULT_DB = {
    "invoices": [],
    "inventory": [],
    "employees": [],
    "orders": [],
    "products": [],
    "work_logs": [],
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


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


def _load() -> Dict[str, Any]:
    return load_db(DATA_PATH, DEFAULT_DB)


def _tx(mutator):
    return run_transaction(DATA_PATH, DEFAULT_DB, mutator)


class ErpOrchestrator:
    # --- Invoices ---

    def list_invoices(self) -> List[Dict[str, Any]]:
        return sorted(
            _load()["invoices"],
            key=lambda x: x.get("updated_at", ""),
            reverse=True,
        )

    def get_invoice(self, record_id: str) -> Dict[str, Any]:
        row = _find(_load()["invoices"], record_id)
        if not row:
            raise ValueError(f"Invoice not found: {record_id}")
        return row

    def create_invoice(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        def mutator(data: Dict[str, Any]) -> Dict[str, Any]:
            ts = _now()
            record = {
                "id": _uid("inv"),
                "client_id": payload.get("client_id") or "",
                "client_name": require_str(payload, "client_name", "Client"),
                "invoice_number": payload.get("invoice_number")
                or f"INV-{uuid.uuid4().hex[:8].upper()}",
                "amount": optional_float(payload, "amount", 0),
                "currency": payload.get("currency") or "USD",
                "status": payload.get("status") or "draft",
                "due_date": payload.get("due_date") or ts[:10],
                "line_items": payload.get("line_items") or [],
                "order_id": payload.get("order_id") or "",
                "product_id": payload.get("product_id") or "",
                "notes": payload.get("notes"),
                "created_at": ts,
                "updated_at": ts,
            }
            data["invoices"].append(record)
            return dict(record)

        record = _tx(mutator)
        if should_emit_invoice_event(float(record.get("amount") or 0)):
            emit_intelligence_event(
                "high_value_invoice",
                {
                    "invoice_id": record["id"],
                    "invoice_number": record.get("invoice_number"),
                    "amount": record.get("amount"),
                    "currency": record.get("currency"),
                    "client_name": record.get("client_name"),
                    "order_id": record.get("order_id"),
                },
                pillar_id="capital",
            )
        return record

    def update_invoice(self, record_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        def mutator(data: Dict[str, Any]) -> Dict[str, Any]:
            row = _find(data["invoices"], record_id)
            if not row:
                raise ValueError(f"Invoice not found: {record_id}")
            for field in (
                "client_name",
                "status",
                "notes",
                "currency",
                "due_date",
                "order_id",
                "product_id",
            ):
                if field in payload and payload[field] is not None:
                    row[field] = payload[field]
            if "amount" in payload:
                row["amount"] = optional_float(payload, "amount", row.get("amount", 0))
            if "line_items" in payload:
                row["line_items"] = payload["line_items"]
            row["updated_at"] = _now()
            return dict(row)

        record = _tx(mutator)
        if should_emit_invoice_event(float(record.get("amount") or 0)):
            emit_intelligence_event(
                "high_value_invoice",
                {
                    "invoice_id": record["id"],
                    "invoice_number": record.get("invoice_number"),
                    "amount": record.get("amount"),
                    "currency": record.get("currency"),
                    "client_name": record.get("client_name"),
                    "order_id": record.get("order_id"),
                },
                pillar_id="capital",
            )
        return record

    def delete_invoice(self, record_id: str) -> bool:
        def mutator(data: Dict[str, Any]) -> bool:
            if not _remove(data["invoices"], record_id):
                raise ValueError(f"Invoice not found: {record_id}")
            return True

        return _tx(mutator)

    # --- Inventory ---

    def list_inventory(self) -> List[Dict[str, Any]]:
        return sorted(
            _load()["inventory"],
            key=lambda x: x.get("updated_at", ""),
            reverse=True,
        )

    def get_inventory(self, record_id: str) -> Dict[str, Any]:
        row = _find(_load()["inventory"], record_id)
        if not row:
            raise ValueError(f"Inventory item not found: {record_id}")
        return row

    def create_inventory(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        def mutator(data: Dict[str, Any]) -> Dict[str, Any]:
            ts = _now()
            record = {
                "id": _uid("sku"),
                "product_id": payload.get("product_id") or "",
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
            return dict(record)

        return _tx(mutator)

    def adjust_stock(self, item_id: str, delta: int) -> Dict[str, Any]:
        def mutator(data: Dict[str, Any]) -> Dict[str, Any]:
            row = _find(data["inventory"], item_id)
            if not row:
                raise ValueError(f"Inventory item not found: {item_id}")
            row["quantity"] = max(0, int(row.get("quantity", 0)) + delta)
            row["updated_at"] = _now()
            return dict(row)

        record = _tx(mutator)
        if should_emit_inventory_event(
            delta, int(record.get("quantity") or 0), int(record.get("reorder_level") or 0)
        ):
            emit_intelligence_event(
                "inventory_major_update",
                {
                    "inventory_id": record["id"],
                    "sku": record.get("sku"),
                    "name": record.get("name"),
                    "delta": delta,
                    "quantity": record.get("quantity"),
                    "reorder_level": record.get("reorder_level"),
                },
                pillar_id="create",
            )
        return record

    def update_inventory(self, record_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        previous_qty: Optional[int] = None

        def mutator(data: Dict[str, Any]) -> Dict[str, Any]:
            nonlocal previous_qty
            row = _find(data["inventory"], record_id)
            if not row:
                raise ValueError(f"Inventory item not found: {record_id}")
            previous_qty = int(row.get("quantity") or 0)
            for field in ("name", "category", "location", "brand_agent", "sku", "product_id"):
                if field in payload and payload[field] is not None:
                    row[field] = str(payload[field]).strip()
            if "quantity" in payload:
                row["quantity"] = optional_int(payload, "quantity", row.get("quantity", 0))
            if "reorder_level" in payload:
                row["reorder_level"] = optional_int(
                    payload, "reorder_level", row.get("reorder_level", 10)
                )
            if "unit_cost" in payload:
                row["unit_cost"] = optional_float(payload, "unit_cost", row.get("unit_cost", 0))
            row["updated_at"] = _now()
            return dict(row)

        record = _tx(mutator)
        delta = int(record.get("quantity") or 0) - int(previous_qty or 0)
        if should_emit_inventory_event(
            delta, int(record.get("quantity") or 0), int(record.get("reorder_level") or 0)
        ):
            emit_intelligence_event(
                "inventory_major_update",
                {
                    "inventory_id": record["id"],
                    "sku": record.get("sku"),
                    "name": record.get("name"),
                    "delta": delta,
                    "quantity": record.get("quantity"),
                    "reorder_level": record.get("reorder_level"),
                },
                pillar_id="create",
            )
        return record

    def delete_inventory(self, record_id: str) -> bool:
        def mutator(data: Dict[str, Any]) -> bool:
            if not _remove(data["inventory"], record_id):
                raise ValueError(f"Inventory item not found: {record_id}")
            return True

        return _tx(mutator)

    # --- HR ---

    def list_employees(self) -> List[Dict[str, Any]]:
        return sorted(
            _load()["employees"],
            key=lambda x: x.get("updated_at", ""),
            reverse=True,
        )

    def get_employee(self, record_id: str) -> Dict[str, Any]:
        row = _find(_load()["employees"], record_id)
        if not row:
            raise ValueError(f"Employee not found: {record_id}")
        return row

    def create_employee(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        def mutator(data: Dict[str, Any]) -> Dict[str, Any]:
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
            return dict(record)

        return _tx(mutator)

    def update_employee(self, record_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        def mutator(data: Dict[str, Any]) -> Dict[str, Any]:
            row = _find(data["employees"], record_id)
            if not row:
                raise ValueError(f"Employee not found: {record_id}")
            previous = row.get("status")
            for field in (
                "name",
                "role",
                "department",
                "email",
                "phone",
                "status",
                "notes",
                "hire_date",
            ):
                if field in payload and payload[field] is not None:
                    row[field] = payload[field]
            if "salary" in payload:
                row["salary"] = payload["salary"]
            row["updated_at"] = _now()
            return {"record": dict(row), "previous_status": previous}

        result = _tx(mutator)
        record = result["record"]
        if (
            result["previous_status"] != record.get("status")
            and record.get("status") == "terminated"
        ):
            emit_intelligence_event(
                "system_state_change",
                {
                    "message": f"Employee {record.get('name')} marked terminated.",
                    "employee_id": record["id"],
                    "actions": ["Revoke system access", "Close open assignments"],
                },
                pillar_id="capital",
            )
        return record

    def delete_employee(self, record_id: str) -> bool:
        def mutator(data: Dict[str, Any]) -> bool:
            if not _remove(data["employees"], record_id):
                raise ValueError(f"Employee not found: {record_id}")
            return True

        return _tx(mutator)

    # --- Daily Work Logs ---

    def list_work_logs(self, log_date: Optional[str] = None) -> List[Dict[str, Any]]:
        data = _load()
        rows = data.get("work_logs") or []
        if log_date:
            rows = [r for r in rows if r.get("log_date") == log_date]
        return sorted(rows, key=lambda x: x.get("updated_at", ""), reverse=True)

    def get_work_log(self, record_id: str) -> Dict[str, Any]:
        row = _find(_load().get("work_logs") or [], record_id)
        if not row:
            raise ValueError(f"Work log not found: {record_id}")
        return row

    def create_work_log(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        def mutator(data: Dict[str, Any]) -> Dict[str, Any]:
            if "work_logs" not in data or not isinstance(data["work_logs"], list):
                data["work_logs"] = []
            ts = _now()
            in_progress = []
            for item in payload.get("tasks_in_progress") or []:
                if not isinstance(item, dict):
                    continue
                name = str(item.get("name") or "").strip()
                if not name:
                    continue
                try:
                    pct = int(item.get("progress_pct") or 0)
                except (TypeError, ValueError):
                    pct = 0
                in_progress.append(
                    {"name": name, "progress_pct": max(0, min(100, pct))}
                )
            health = payload.get("project_health") or "on_track"
            if health not in {"on_track", "at_risk", "blocked"}:
                health = "on_track"
            record = {
                "id": _uid("wl"),
                "log_date": (payload.get("log_date") or ts[:10]).strip()[:10],
                "member_name": require_str(payload, "member_name", "Member"),
                "member_role": (payload.get("member_role") or "Team").strip(),
                "submitted_by": (payload.get("submitted_by") or "").strip() or None,
                "tasks_completed": [
                    str(x).strip()
                    for x in (payload.get("tasks_completed") or [])
                    if str(x).strip()
                ][:20],
                "tasks_in_progress": in_progress[:20],
                "blockers": [
                    str(x).strip()
                    for x in (payload.get("blockers") or [])
                    if str(x).strip()
                ][:20],
                "next_day_plan": [
                    str(x).strip()
                    for x in (payload.get("next_day_plan") or [])
                    if str(x).strip()
                ][:20],
                "project_health": health,
                "backend_notes": (payload.get("backend_notes") or "").strip() or None,
                "agent_activity_ids": [
                    str(x).strip()
                    for x in (payload.get("agent_activity_ids") or [])
                    if str(x).strip()
                ][:50],
                "created_at": ts,
                "updated_at": ts,
            }
            data["work_logs"].append(record)
            return dict(record)

        record = _tx(mutator)
        if record.get("project_health") in {"at_risk", "blocked"}:
            emit_intelligence_event(
                "system_state_change",
                {
                    "message": (
                        f"Daily work log {record.get('project_health')} — "
                        f"{record.get('member_name')} on {record.get('log_date')}"
                    ),
                    "work_log_id": record["id"],
                    "actions": [
                        "Review blockers",
                        "Unblock agent / backend process",
                        "Confirm next-day plan",
                    ],
                },
                pillar_id="capital",
            )
        return record

    def update_work_log(self, record_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        def mutator(data: Dict[str, Any]) -> Dict[str, Any]:
            if "work_logs" not in data:
                data["work_logs"] = []
            row = _find(data["work_logs"], record_id)
            if not row:
                raise ValueError(f"Work log not found: {record_id}")
            for field in (
                "log_date",
                "member_name",
                "member_role",
                "submitted_by",
                "backend_notes",
            ):
                if field in payload and payload[field] is not None:
                    row[field] = payload[field]
            for list_field in (
                "tasks_completed",
                "blockers",
                "next_day_plan",
                "agent_activity_ids",
            ):
                if list_field in payload and payload[list_field] is not None:
                    row[list_field] = [
                        str(x).strip()
                        for x in (payload.get(list_field) or [])
                        if str(x).strip()
                    ]
            if "tasks_in_progress" in payload and payload["tasks_in_progress"] is not None:
                cleaned = []
                for item in payload["tasks_in_progress"] or []:
                    if not isinstance(item, dict):
                        continue
                    name = str(item.get("name") or "").strip()
                    if not name:
                        continue
                    try:
                        pct = int(item.get("progress_pct") or 0)
                    except (TypeError, ValueError):
                        pct = 0
                    cleaned.append(
                        {"name": name, "progress_pct": max(0, min(100, pct))}
                    )
                row["tasks_in_progress"] = cleaned
            if "project_health" in payload and payload["project_health"] is not None:
                health = payload["project_health"]
                if health in {"on_track", "at_risk", "blocked"}:
                    row["project_health"] = health
            row["updated_at"] = _now()
            return dict(row)

        return _tx(mutator)

    def delete_work_log(self, record_id: str) -> bool:
        def mutator(data: Dict[str, Any]) -> bool:
            if "work_logs" not in data:
                data["work_logs"] = []
            if not _remove(data["work_logs"], record_id):
                raise ValueError(f"Work log not found: {record_id}")
            return True

        return _tx(mutator)

    def work_log_stats(self, log_date: Optional[str] = None) -> Dict[str, Any]:
        day = log_date or _now()[:10]
        today = self.list_work_logs(day)
        members = {str(r.get("member_name") or "").lower() for r in today}
        pct_sum = 0
        pct_count = 0
        for row in today:
            for item in row.get("tasks_in_progress") or []:
                if isinstance(item, dict):
                    try:
                        pct_sum += int(item.get("progress_pct") or 0)
                        pct_count += 1
                    except (TypeError, ValueError):
                        pass
        return {
            "total_today": len(today),
            "on_track": sum(1 for r in today if r.get("project_health") == "on_track"),
            "at_risk": sum(1 for r in today if r.get("project_health") == "at_risk"),
            "blocked": sum(1 for r in today if r.get("project_health") == "blocked"),
            "members_logged_today": len({m for m in members if m}),
            "avg_in_progress_pct": round(pct_sum / pct_count) if pct_count else 0,
        }

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
        def mutator(data: Dict[str, Any]) -> Dict[str, Any]:
            ts = _now()
            record = {
                "id": _uid("ord"),
                "order_number": payload.get("order_number")
                or f"ORD-{uuid.uuid4().hex[:8].upper()}",
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
                "invoice_id": "",
                "inventory_id": "",
                "inventory_adjusted": False,
                "created_at": ts,
                "updated_at": ts,
            }
            if record["total"] == 0:
                record["total"] = round(record["quantity"] * record["unit_price"], 2)

            # Enrich product_name from catalog when only product_id provided
            if record["product_id"] and not record["product_name"]:
                product = _find(data["products"], record["product_id"])
                if product:
                    record["product_name"] = product.get("name") or ""
                    if not record["unit_price"]:
                        record["unit_price"] = float(product.get("unit_price") or 0)
                        record["total"] = round(
                            record["quantity"] * record["unit_price"], 2
                        )

            effects = apply_order_side_effects(data, record, previous_status=None)
            data["orders"].append(record)
            return {"order": dict(record), "effects": effects}

        result = _tx(mutator)
        order = result["order"]
        effects = result["effects"]
        logs = emit_post_commit_events(
            order,
            effects,
            cancelled=order.get("status") == "cancelled",
        )
        order["_sync"] = {
            "inventory": effects.get("inventory"),
            "invoice": effects.get("invoice"),
            "events": effects.get("events"),
            "tac_logs": [log.get("id") for log in logs],
        }
        return order

    def update_order(self, record_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        def mutator(data: Dict[str, Any]) -> Dict[str, Any]:
            row = _find(data["orders"], record_id)
            if not row:
                raise ValueError(f"Order not found: {record_id}")
            previous_status = row.get("status")
            for field in (
                "client_name",
                "product_name",
                "status",
                "notes",
                "currency",
                "client_id",
                "product_id",
            ):
                if field in payload and payload[field] is not None:
                    row[field] = payload[field]
            if "quantity" in payload:
                row["quantity"] = optional_int(payload, "quantity", row.get("quantity", 1))
            if "unit_price" in payload:
                row["unit_price"] = optional_float(
                    payload, "unit_price", row.get("unit_price", 0)
                )
            if "total" in payload:
                row["total"] = optional_float(payload, "total", row.get("total", 0))
            elif "quantity" in payload or "unit_price" in payload:
                row["total"] = round(row.get("quantity", 1) * row.get("unit_price", 0), 2)
            row["updated_at"] = _now()

            effects = apply_order_side_effects(data, row, previous_status=previous_status)
            return {
                "order": dict(row),
                "effects": effects,
                "previous_status": previous_status,
            }

        result = _tx(mutator)
        order = result["order"]
        effects = result["effects"]
        cancelled = (
            result["previous_status"] != "cancelled" and order.get("status") == "cancelled"
        )
        logs = emit_post_commit_events(order, effects, cancelled=cancelled)
        order["_sync"] = {
            "inventory": effects.get("inventory"),
            "invoice": effects.get("invoice"),
            "events": effects.get("events"),
            "tac_logs": [log.get("id") for log in logs],
        }
        return order

    def delete_order(self, record_id: str) -> bool:
        def mutator(data: Dict[str, Any]) -> bool:
            row = _find(data["orders"], record_id)
            if not row:
                raise ValueError(f"Order not found: {record_id}")
            # Restore stock if a finalized order is deleted
            if row.get("inventory_adjusted") and row.get("status") in {
                "confirmed",
                "fulfilled",
            }:
                apply_order_side_effects(
                    data,
                    {**row, "status": "cancelled"},
                    previous_status=row.get("status"),
                )
            if not _remove(data["orders"], record_id):
                raise ValueError(f"Order not found: {record_id}")
            return True

        return _tx(mutator)

    # --- Products (catalog) ---

    def list_products(self) -> List[Dict[str, Any]]:
        return sorted(
            _load()["products"],
            key=lambda x: x.get("updated_at", ""),
            reverse=True,
        )

    def get_product(self, record_id: str) -> Dict[str, Any]:
        row = _find(_load()["products"], record_id)
        if not row:
            raise ValueError(f"Product not found: {record_id}")
        return row

    def create_product(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        def mutator(data: Dict[str, Any]) -> Dict[str, Any]:
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
            inventory = ensure_inventory_for_product(data, record)
            return {"product": dict(record), "inventory": dict(inventory)}

        result = _tx(mutator)
        product = result["product"]
        product["_sync"] = {"inventory": result["inventory"]}
        return product

    def update_product(self, record_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        def mutator(data: Dict[str, Any]) -> Dict[str, Any]:
            row = _find(data["products"], record_id)
            if not row:
                raise ValueError(f"Product not found: {record_id}")
            for field in ("name", "sku", "category", "description", "currency", "brand_agent"):
                if field in payload and payload[field] is not None:
                    row[field] = payload[field]
            if "unit_price" in payload:
                row["unit_price"] = optional_float(
                    payload, "unit_price", row.get("unit_price", 0)
                )
            if "active" in payload:
                row["active"] = bool(payload["active"])
            row["updated_at"] = _now()
            inventory = ensure_inventory_for_product(data, row)
            return {"product": dict(row), "inventory": dict(inventory)}

        result = _tx(mutator)
        product = result["product"]
        product["_sync"] = {"inventory": result["inventory"]}
        return product

    def delete_product(self, record_id: str) -> bool:
        def mutator(data: Dict[str, Any]) -> bool:
            if not _remove(data["products"], record_id):
                raise ValueError(f"Product not found: {record_id}")
            return True

        return _tx(mutator)

    def health_modules(self) -> Dict[str, Any]:
        data = _load()
        counts = {
            "invoices": len(data["invoices"]),
            "inventory": len(data["inventory"]),
            "employees": len(data["employees"]),
            "orders": len(data["orders"]),
            "products": len(data["products"]),
            "work_logs": len(data.get("work_logs") or []),
        }
        return module_health_snapshot(counts)


erp = ErpOrchestrator()
