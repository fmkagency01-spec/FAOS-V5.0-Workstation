"""FAOS v6.0 — Base agent executor with JSON fallback (Python)."""

from __future__ import annotations

import json
import time
from typing import Any, Dict, Optional

from faos_core.orchestrator.agent_registry import get_agent, set_agent_state


def _safe_parse_json(raw: str) -> Optional[Dict[str, Any]]:
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
        return {"value": parsed}
    except (json.JSONDecodeError, TypeError):
        return None


def build_deterministic_deliverable(
    agent: Dict[str, Any], input_data: Dict[str, Any]
) -> Dict[str, Any]:
    command = str(input_data.get("command") or "")
    return {
        "agent_id": agent.get("id"),
        "agent_name": agent.get("name"),
        "domain": agent.get("domain"),
        "task_id": input_data.get("task_id"),
        "category": input_data.get("category") or "general",
        "brand": input_data.get("brand") or "BulletsEye / FMK Group",
        "summary": f"{agent.get('name')} processed: {command[:180]}",
        "deliverable": "\n".join(
            [
                f"# {agent.get('name')} Output",
                "",
                f"Domain: {agent.get('domain')}",
                f"Brief: {command}",
                "",
                "## Recommended actions",
                "1. Confirm scope with client",
                "2. Produce draft deliverable for QA",
                "3. Route to approval gate",
            ]
        ),
        "model_hint": agent.get("model_hint"),
        "status": "completed",
    }


def run_agent_module(
    agent_id: str,
    input_data: Dict[str, Any],
    *,
    enrich_raw: Optional[str] = None,
) -> Dict[str, Any]:
    started = time.time()
    agent = get_agent(agent_id)

    if not agent:
        state = set_agent_state(
            agent_id,
            status="failed",
            current_task=input_data.get("task_id"),
            output=None,
            error="agent_not_registered",
            latency_ms=(time.time() - started) * 1000,
        )
        return {
            "state": state,
            "deliverable": f"Agent {agent_id} is not registered.",
            "structured": {"error": "agent_not_registered"},
            "used_fallback": True,
        }

    set_agent_state(
        agent_id,
        status="running",
        current_task=input_data.get("task_id"),
        output=None,
        error=None,
    )

    used_fallback = False
    structured = build_deterministic_deliverable(agent, input_data)

    if enrich_raw is not None:
        parsed = _safe_parse_json(enrich_raw)
        if parsed is None:
            used_fallback = True
            structured = {
                **structured,
                "llm_raw": enrich_raw[:4000],
                "note": "malformed_json_fallback",
            }
        else:
            structured = {**structured, **parsed, "llm_enriched": True}

    deliverable = (
        structured["deliverable"]
        if isinstance(structured.get("deliverable"), str)
        else json.dumps(structured, indent=2)
    )

    state = set_agent_state(
        agent_id,
        status="fallback" if used_fallback else "completed",
        current_task=input_data.get("task_id"),
        output=structured,
        error=str(structured.get("note")) if used_fallback else None,
        latency_ms=(time.time() - started) * 1000,
    )

    return {
        "state": state,
        "deliverable": deliverable,
        "structured": structured,
        "used_fallback": used_fallback,
    }
