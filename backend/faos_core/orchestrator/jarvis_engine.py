"""FAOS v6.0 — Jarvis Master Orchestrator (Python)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from faos_core.agents.execution_graph import execute_agent_graph
from faos_core.orchestrator.agent_registry import (
    get_orchestrator_id,
    list_agents,
    match_agents,
    set_agent_state,
)
from faos_core.orchestrator.health import health_snapshot
from faos_core.pipelines.client_task_pipeline import run_client_task_pipeline
from faos_core.pipelines.ingestion import detect_task_category
from faos_core.types import FAOS_V6_VERSION


def _looks_like_client_brief(text: str) -> bool:
    import re

    return bool(
        re.search(
            r"brief|campaign|deliverable|script|design|smm|seo|ads?|client task",
            text,
            re.I,
        )
    )


async def jarvis_route(
    raw_input: str,
    *,
    mode: str = "auto",
    agent_ids: Optional[List[str]] = None,
    brand: Optional[str] = None,
    auto_approve: Optional[bool] = True,
) -> Dict[str, Any]:
    command = (raw_input or "").strip()
    if not command:
        raise ValueError("Input is required")

    category = detect_task_category(command)
    matches = match_agents(command, 4)
    orch = get_orchestrator_id()
    primary = (agent_ids[0] if agent_ids else None) or (
        matches[0]["id"] if matches else orch
    )
    supporting = [
        i
        for i in (
            (agent_ids[1:] if agent_ids else None)
            or [m["id"] for m in matches[1:]]
        )
        if i != primary
    ]

    set_agent_state(
        orch,
        status="running",
        current_task=command[:120],
        output={"category": category, "primary": primary, "supporting": supporting},
    )

    resolved_mode = mode if mode != "auto" else (
        "pipeline" if _looks_like_client_brief(command) else "graph"
    )

    if resolved_mode == "pipeline":
        pipeline = await run_client_task_pipeline(
            {
                "details": command,
                "category": category,
                "brand": brand,
                "agent_ids": agent_ids or [primary, *supporting],
            },
            auto_approve=auto_approve,
            brand=brand,
        )
        set_agent_state(
            orch,
            status="completed",
            current_task=pipeline["pipeline_id"],
            output={
                "pipeline_id": pipeline["pipeline_id"],
                "stage": pipeline["stage"],
            },
        )
        return {
            "version": FAOS_V6_VERSION,
            "mode": "pipeline",
            "category": category,
            "primary_agent": primary,
            "supporting_agents": supporting,
            "agent_states": pipeline["agent_states"],
            "pipeline": pipeline,
            "reply": (pipeline.get("approval") or {}).get("client_facing_output"),
        }

    graph = await execute_agent_graph(
        command,
        agent_ids=agent_ids or [primary, *supporting],
        category=category,
        brand=brand,
    )
    set_agent_state(
        orch,
        status="completed",
        current_task=graph["graph_id"],
        output={"graph_id": graph["graph_id"]},
    )
    return {
        "version": FAOS_V6_VERSION,
        "mode": "graph",
        "category": category,
        "primary_agent": primary,
        "supporting_agents": supporting,
        "agent_states": graph["agent_states"],
        "graph": graph,
        "reply": graph["aggregated"].get("combined_text"),
    }


def jarvis_network_status() -> Dict[str, Any]:
    health = health_snapshot()
    return {
        "version": FAOS_V6_VERSION,
        "orchestrator": get_orchestrator_id(),
        "agents_total": len(list_agents()),
        "health": health,
        "message": "Jarvis v6 master orchestrator online",
    }
