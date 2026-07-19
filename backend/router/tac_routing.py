"""FAOS v5.3 — TAC Central Brain sync & pillar orchestration."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

ECOSYSTEM_PATH = Path(__file__).resolve().parents[1] / "data" / "fmk_tac_ecosystem.json"
STATE_PATH = Path(__file__).resolve().parents[1] / "data" / "faos_tac_state.json"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_ecosystem() -> Dict[str, Any]:
    with ECOSYSTEM_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


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


class TacOrchestrator:
    def get_status(self) -> Dict[str, Any]:
        eco = _load_ecosystem()
        state = _load_state()
        return {
            "ok": True,
            "version": eco.get("version", "5.3.0"),
            "parent_company": eco["parent_company"],
            "pillars": eco["pillars"],
            "jarvis": eco["jarvis_orchestrator"],
            "last_sync": state.get("last_sync"),
            "aigorithm": eco["parent_company"]["aigorithm_engine"],
            "gatekeeper_protocol": eco["parent_company"]["gatekeeper_protocol"],
        }

    def sync_pillars(self) -> Dict[str, Any]:
        eco = _load_ecosystem()
        state = _load_state()
        ts = _now()
        state["last_sync"] = ts
        state["pillar_tasks"] = [
            {
                "pillar_id": p["id"],
                "pillar_name": p["name"],
                "agents": p["agents"],
                "work_sections": p["work_sections"],
                "status": "synced",
                "updated_at": ts,
            }
            for p in eco["pillars"]
        ]
        _save_state(state)
        return {
            "ok": True,
            "message": "TAC brain synced with 3 pillars and shell agents",
            "synced_at": ts,
            "pillars": len(eco["pillars"]),
            "total_agents": sum(len(p["agents"]) for p in eco["pillars"]),
        }

    def dispatch_command(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        command = (payload.get("command") or "").strip()
        pillar_id = payload.get("pillar_id") or "create"
        if not command:
            raise ValueError("command is required")

        eco = _load_ecosystem()
        pillar = next((p for p in eco["pillars"] if p["id"] == pillar_id), None)
        if not pillar:
            raise ValueError(f"Unknown pillar: {pillar_id}")

        state = _load_state()
        record = {
            "id": f"tac_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            "pillar_id": pillar_id,
            "command": command,
            "agents": pillar["agents"][:3],
            "status": "queued_for_jarvis",
            "created_at": _now(),
        }
        state.setdefault("tac_commands", []).append(record)
        state["last_sync"] = _now()
        _save_state(state)

        return {
            "ok": True,
            "tac_record": record,
            "pillar": pillar["name"],
            "routed_agents": pillar["agents"][:3],
            "jarvis_route": eco["jarvis_orchestrator"]["route"],
            "message": f"Command routed to {pillar['name']} via TAC brain",
        }

    def list_commands(self) -> List[Dict[str, Any]]:
        state = _load_state()
        return sorted(
            state.get("tac_commands", []),
            key=lambda c: c.get("created_at", ""),
            reverse=True,
        )

    def list_intelligence(self, limit: int = 50) -> List[Dict[str, Any]]:
        from services.tac_events import list_intelligence_logs

        return list_intelligence_logs(limit)

    def record_system_event(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        from services.tac_events import emit_intelligence_event

        event_type = (payload.get("event_type") or "system_state_change").strip()
        pillar_id = payload.get("pillar_id") or "capital"
        body = payload.get("payload") if isinstance(payload.get("payload"), dict) else payload
        record = emit_intelligence_event(event_type, body, pillar_id=pillar_id)
        return {"ok": True, "log": record}


tac = TacOrchestrator()
