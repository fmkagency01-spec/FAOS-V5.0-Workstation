"""FAOS v6.0 — Agent verification & health checks (Python)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from faos_core.orchestrator.agent_registry import (
    ensure_agent_states,
    get_agent,
    get_orchestrator_id,
    list_agents,
    registry_stats,
)
from faos_core.types import EXPECTED_SHELL_AGENT_COUNT, FAOS_V6_VERSION

FORBIDDEN_IDS = ("fmk_week", "fmcg_wish", "fmk_fmcg_week_supply_agent")
REQUIRED_FIELDS = ("id", "name", "icon", "domain", "keywords", "model_hint", "description")


def audit_agent_definitions() -> Dict[str, Any]:
    agents = list_agents()
    findings: List[Dict[str, Any]] = []
    seen = set()

    for agent in agents:
        issues: List[str] = []
        for field in REQUIRED_FIELDS:
            value = agent.get(field)
            if value is None or value == "":
                issues.append(f"missing_{field}")
        keywords = agent.get("keywords")
        if not isinstance(keywords, list) or len(keywords) == 0:
            issues.append("empty_keywords")
        agent_id = str(agent.get("id") or "")
        if agent_id in seen:
            issues.append("duplicate_id")
        seen.add(agent_id)
        if agent_id in FORBIDDEN_IDS:
            issues.append("forbidden_namespace")
        findings.append(
            {
                "agent_id": agent_id,
                "ok": len(issues) == 0,
                "issues": issues,
                "domain": agent.get("domain"),
                "name": agent.get("name"),
            }
        )

    orch = get_orchestrator_id()
    if not get_agent(orch):
        findings.append(
            {
                "agent_id": orch,
                "ok": False,
                "issues": ["orchestrator_missing_from_roster"],
                "domain": None,
                "name": None,
            }
        )

    if len(agents) != EXPECTED_SHELL_AGENT_COUNT:
        findings.append(
            {
                "agent_id": "_roster",
                "ok": False,
                "issues": [
                    f"count_mismatch:expected_{EXPECTED_SHELL_AGENT_COUNT}:found_{len(agents)}"
                ],
                "domain": None,
                "name": None,
            }
        )

    ensure_agent_states()
    failed = [f for f in findings if not f["ok"]]
    stats = registry_stats()
    ok = len(failed) == 0

    return {
        "ok": ok,
        "version": FAOS_V6_VERSION,
        "expected_agents": EXPECTED_SHELL_AGENT_COUNT,
        "found_agents": len(agents),
        "orchestrator": orch,
        "findings": findings,
        "summary": (
            f"All {len(agents)} agents healthy · registry {stats['version']} · orchestrator {orch}"
            if ok
            else f"{len(failed)} issue(s) across {len(agents)} agents"
        ),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def health_snapshot() -> Dict[str, Any]:
    report = audit_agent_definitions()
    states = ensure_agent_states()
    return {
        "ok": report["ok"],
        "version": FAOS_V6_VERSION,
        "registry": registry_stats(),
        "diagnostics": report,
        "agent_states": states,
        "live": {
            "idle": sum(1 for s in states if s.get("status") == "idle"),
            "running": sum(1 for s in states if s.get("status") == "running"),
            "failed": sum(
                1 for s in states if s.get("status") in {"failed", "fallback"}
            ),
        },
    }
