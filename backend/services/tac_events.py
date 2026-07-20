"""TAC Intelligence event bus — pipes ERP / system events into TAC logs + AI insights."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

STATE_PATH = Path(__file__).resolve().parents[1] / "data" / "faos_tac_state.json"

HIGH_VALUE_INVOICE = float(os.getenv("FAOS_HIGH_VALUE_INVOICE_THRESHOLD", "1000"))
MAJOR_INVENTORY_DELTA = int(os.getenv("FAOS_MAJOR_INVENTORY_DELTA", "25"))
MAX_INTELLIGENCE_LOGS = 200


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_state() -> Dict[str, Any]:
    if not STATE_PATH.exists():
        return {
            "last_sync": None,
            "pillar_tasks": [],
            "tac_commands": [],
            "intelligence_logs": [],
        }
    with STATE_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)
    data.setdefault("intelligence_logs", [])
    data.setdefault("tac_commands", [])
    data.setdefault("pillar_tasks", [])
    return data


def _save_state(data: Dict[str, Any]) -> None:
    from services.erp_tx import atomic_save

    atomic_save(STATE_PATH, data)


def _rule_insight(event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Deterministic management insight when OpenRouter is unavailable."""
    if event_type == "order_finalized":
        total = float(payload.get("total") or 0)
        qty = int(payload.get("quantity") or 0)
        severity = "anomaly" if total >= HIGH_VALUE_INVOICE else "info"
        return {
            "severity": severity,
            "summary": (
                f"Order {payload.get('order_number')} finalized — "
                f"stock −{qty}, invoice linked, total {payload.get('currency', 'USD')} {total:.2f}."
            ),
            "actions": [
                "Verify warehouse pick completed",
                "Confirm invoice delivery to client",
            ],
            "source": "rule_engine",
        }
    if event_type == "order_cancelled":
        return {
            "severity": "warning",
            "summary": (
                f"Order {payload.get('order_number')} cancelled — "
                "stock restored and linked invoice marked cancelled."
            ),
            "actions": ["Review cancellation reason", "Notify sales owner"],
            "source": "rule_engine",
        }
    if event_type == "inventory_major_update":
        delta = int(payload.get("delta") or 0)
        qty = int(payload.get("quantity") or 0)
        reorder = int(payload.get("reorder_level") or 0)
        severity = "anomaly" if qty <= reorder else "warning"
        return {
            "severity": severity,
            "summary": (
                f"Major inventory move on {payload.get('sku')}: delta {delta:+d}, "
                f"on-hand {qty} (reorder {reorder})."
            ),
            "actions": [
                "Check reorder / PO pipeline" if qty <= reorder else "Audit stock movement",
            ],
            "source": "rule_engine",
        }
    if event_type == "high_value_invoice":
        return {
            "severity": "anomaly",
            "summary": (
                f"High-value invoice {payload.get('invoice_number')} "
                f"({payload.get('currency', 'USD')} {float(payload.get('amount') or 0):.2f}) "
                f"for {payload.get('client_name')}."
            ),
            "actions": ["Finance approval review", "Confirm payment terms"],
            "source": "rule_engine",
        }
    if event_type == "system_state_change":
        return {
            "severity": "info",
            "summary": str(payload.get("message") or "System state changed."),
            "actions": list(payload.get("actions") or []),
            "source": "rule_engine",
        }
    return {
        "severity": "info",
        "summary": f"TAC event recorded: {event_type}",
        "actions": [],
        "source": "rule_engine",
    }


def _ai_insight(event_type: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Optional OpenRouter parse — never blocks the ERP transaction on failure."""
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        return None

    prompt = (
        "You are FAOS TAC Intelligence. Given this ERP event JSON, reply with a single JSON object "
        'with keys severity (info|warning|anomaly), summary (one sentence), actions (string array, max 3). '
        "No markdown.\n\n"
        f"event_type={event_type}\npayload={json.dumps(payload)}"
    )
    body = json.dumps(
        {
            "model": os.getenv("FAOS_TAC_INSIGHT_MODEL", "openai/gpt-4o-mini"),
            "messages": [
                {
                    "role": "system",
                    "content": "Return only compact JSON for management insights.",
                },
                {"role": "user", "content": prompt},
            ],
            "max_tokens": 180,
            "temperature": 0.2,
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.getenv(
                "NEXT_PUBLIC_SITE_URL", "https://faos-v5-0-workstation.vercel.app"
            ),
            "X-Title": "FAOS TAC Intelligence",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        text = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:].strip()
        parsed = json.loads(text)
        return {
            "severity": parsed.get("severity") or "info",
            "summary": parsed.get("summary") or "AI insight generated.",
            "actions": list(parsed.get("actions") or [])[:3],
            "source": "openrouter",
        }
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError, TypeError):
        return None


def emit_intelligence_event(
    event_type: str,
    payload: Dict[str, Any],
    *,
    pillar_id: str = "capital",
) -> Dict[str, Any]:
    """Append a TAC intelligence log and attach AI or rule-based insight."""
    insight = _ai_insight(event_type, payload) or _rule_insight(event_type, payload)
    record = {
        "id": f"tac_intel_{uuid.uuid4().hex[:12]}",
        "event_type": event_type,
        "pillar_id": pillar_id,
        "payload": payload,
        "insight": insight,
        "status": "logged",
        "created_at": _now(),
    }

    state = _load_state()
    logs: List[Dict[str, Any]] = state.setdefault("intelligence_logs", [])
    logs.append(record)
    if len(logs) > MAX_INTELLIGENCE_LOGS:
        state["intelligence_logs"] = logs[-MAX_INTELLIGENCE_LOGS:]
    state["last_sync"] = _now()
    _save_state(state)
    return record


def should_emit_inventory_event(delta: int, quantity: int, reorder_level: int) -> bool:
    return abs(delta) >= MAJOR_INVENTORY_DELTA or quantity <= reorder_level


def should_emit_invoice_event(amount: float) -> bool:
    return amount >= HIGH_VALUE_INVOICE


def list_intelligence_logs(limit: int = 50) -> List[Dict[str, Any]]:
    state = _load_state()
    logs = sorted(
        state.get("intelligence_logs", []),
        key=lambda r: r.get("created_at", ""),
        reverse=True,
    )
    return logs[: max(1, min(limit, 200))]


def module_health_snapshot(erp_counts: Dict[str, int]) -> Dict[str, Any]:
    state = _load_state()
    return {
        "tac": {
            "status": "operational",
            "last_sync": state.get("last_sync"),
            "commands": len(state.get("tac_commands", [])),
            "intelligence_logs": len(state.get("intelligence_logs", [])),
            "pillar_tasks": len(state.get("pillar_tasks", [])),
        },
        "modules": {
            "invoicing": {"status": "operational", "records": erp_counts.get("invoices", 0)},
            "inventory": {"status": "operational", "records": erp_counts.get("inventory", 0)},
            "hr": {"status": "operational", "records": erp_counts.get("employees", 0)},
            "orders": {"status": "operational", "records": erp_counts.get("orders", 0)},
            "products": {"status": "operational", "records": erp_counts.get("products", 0)},
        },
    }
