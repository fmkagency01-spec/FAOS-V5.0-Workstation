"""FAOS v6.0 — Hermes Co-Founder (Python parity)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from faos_core.orchestrator.agent_registry import (
    ensure_agent_states,
    get_orchestrator_id,
    list_agents,
    set_agent_state,
)
from faos_core.orchestrator.health import health_snapshot
from faos_core.types import FAOS_V6_VERSION, HERMES_COFOUNDER_ID


def activate_all_agent_teams(reason: str = "hermes_cofounder_boot") -> Dict[str, Any]:
    ids: List[str] = []
    for agent in list_agents():
        aid = str(agent.get("id"))
        set_agent_state(
            aid,
            status="idle",
            current_task=None,
            output={
                "activated_by": HERMES_COFOUNDER_ID,
                "reason": reason,
                "ready": True,
            },
        )
        ids.append(aid)
    set_agent_state(
        HERMES_COFOUNDER_ID,
        status="completed",
        current_task="fleet_activation",
        output={"activated": len(ids), "reason": reason},
    )
    return {"activated": len(ids), "agent_ids": ids}


def hermes_ops_brief() -> Dict[str, Any]:
    health = health_snapshot()
    states = ensure_agent_states()
    findings = health.get("diagnostics", {}).get("findings") or []
    issues = [
        f"{f.get('agent_id')}: {', '.join(f.get('issues') or [])}"
        for f in findings
        if not f.get("ok")
    ]
    active = sum(
        1
        for s in states
        if s.get("status") in {"idle", "queued", "running", "completed", "fallback"}
    )
    summary = (
        f"Hermes Co-Founder online — {active}/{len(states)} agents ready under {get_orchestrator_id()}"
        if not issues
        else f"Hermes Co-Founder alert — {len(issues)} issue(s) across fleet"
    )
    return {
        "ok": len(issues) == 0,
        "version": FAOS_V6_VERSION,
        "role": "co_founder",
        "reports_to": get_orchestrator_id(),
        "agents_total": len(list_agents()),
        "agents_active": active,
        "live": health.get("live") or {},
        "issues": issues,
        "summary": summary,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
