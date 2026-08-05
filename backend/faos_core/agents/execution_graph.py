"""FAOS v6.0 — Asynchronous multi-agent execution graph (Python)."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from faos_core.agents.base_agent import run_agent_module
from faos_core.orchestrator.agent_registry import (
    get_orchestrator_id,
    match_agents,
    set_agent_state,
)


def build_execution_graph(
    command: str, agent_ids: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    orch = get_orchestrator_id()
    ids = [i for i in (agent_ids or []) if i and i != orch]
    if not ids:
        ids = [a["id"] for a in match_agents(command, 3)]
    if not ids:
        ids = [orch]

    primary, *rest = ids
    nodes = [{"agent_id": primary, "depends_on": []}]
    for agent_id in rest:
        nodes.append({"agent_id": agent_id, "depends_on": [primary]})
    return nodes


async def execute_agent_graph(
    command: str,
    *,
    agent_ids: Optional[List[str]] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    started_at = datetime.now(timezone.utc).isoformat()
    graph_id = f"graph_{int(datetime.now().timestamp() * 1000):x}"
    nodes = build_execution_graph(command, agent_ids)
    results: List[Dict[str, Any]] = []
    completed: set[str] = set()

    for node in nodes:
        set_agent_state(
            node["agent_id"],
            status="queued",
            current_task=graph_id,
            output=None,
        )

    remaining = list(nodes)
    while remaining:
        ready = [
            n
            for n in remaining
            if all(dep in completed for dep in n.get("depends_on") or [])
        ]
        if not ready:
            stuck = remaining[:]
            remaining.clear()
            batch = await asyncio.gather(
                *[
                    asyncio.to_thread(
                        run_agent_module,
                        n["agent_id"],
                        {
                            "task_id": f"{graph_id}:{n['agent_id']}",
                            "command": command,
                            "category": category,
                            "brand": brand,
                            "metadata": metadata,
                        },
                    )
                    for n in stuck
                ]
            )
            for result in batch:
                results.append(result)
                completed.add(result["state"]["agent_id"])
            break

        for n in ready:
            remaining.remove(n)

        batch = await asyncio.gather(
            *[
                asyncio.to_thread(
                    run_agent_module,
                    n["agent_id"],
                    {
                        "task_id": f"{graph_id}:{n['agent_id']}",
                        "command": command,
                        "category": category,
                        "brand": brand,
                        "metadata": metadata,
                    },
                )
                for n in ready
            ]
        )
        for result in batch:
            results.append(result)
            completed.add(result["state"]["agent_id"])

    aggregated = {
        "graph_id": graph_id,
        "command": command,
        "agents": [r["state"]["agent_id"] for r in results],
        "deliverables": [
            {
                "agent_id": r["state"]["agent_id"],
                "status": r["state"]["status"],
                "deliverable": r["deliverable"],
                "used_fallback": r["used_fallback"],
            }
            for r in results
        ],
        "combined_text": "\n\n---\n\n".join(r["deliverable"] for r in results),
    }

    return {
        "graph_id": graph_id,
        "nodes": nodes,
        "results": results,
        "agent_states": [r["state"] for r in results],
        "aggregated": aggregated,
        "started_at": started_at,
        "finished_at": datetime.now(timezone.utc).isoformat(),
    }
