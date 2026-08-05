"""FAOS v6.0 — End-to-end client task pipeline (Python)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from faos_core.agents.execution_graph import execute_agent_graph
from faos_core.pipelines.approval import run_approval_gate
from faos_core.pipelines.ingestion import ingest_client_brief
from faos_core.pipelines.qa import evaluate_deliverable
from faos_core.types import FAOS_V6_VERSION


async def run_client_task_pipeline(
    input_data: Dict[str, Any],
    *,
    auto_approve: Optional[bool] = None,
    brand: Optional[str] = None,
) -> Dict[str, Any]:
    started_at = datetime.now(timezone.utc).isoformat()
    pipeline_id = f"pipe_{int(datetime.now().timestamp() * 1000):x}"

    try:
        brief = ingest_client_brief(
            {
                **input_data,
                "brand": input_data.get("brand") or brand or "BulletsEye",
            }
        )

        graph = await execute_agent_graph(
            brief["details"],
            agent_ids=brief.get("agent_ids"),
            category=brief.get("category"),
            brand=brief.get("brand"),
            metadata={
                **(brief.get("metadata") or {}),
                "brief_id": brief["brief_id"],
                "pipeline_id": pipeline_id,
            },
        )

        combined = graph["aggregated"].get("combined_text") or str(graph["aggregated"])
        qa = evaluate_deliverable(brief, combined, len(graph["results"]))
        approval = await run_approval_gate(
            pipeline_id=pipeline_id,
            brief=brief,
            combined_text=combined,
            qa=qa,
            auto_approve=auto_approve,
        )

        return {
            "ok": bool(qa.get("passed")),
            "pipeline_id": pipeline_id,
            "stage": "delivered" if approval.get("ready_for_publish") else "approval",
            "brief": brief,
            "assigned_agents": [r["state"]["agent_id"] for r in graph["results"]],
            "agent_states": graph["agent_states"],
            "aggregated_output": graph["aggregated"],
            "qa": qa,
            "approval": approval,
            "started_at": started_at,
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "version": FAOS_V6_VERSION,
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "pipeline_id": pipeline_id,
            "stage": "failed",
            "brief": {
                "brief_id": "brief_failed",
                "category": "general",
                "title": "Failed brief",
                "details": str(input_data.get("details") or ""),
                "brand": input_data.get("brand") or brand,
            },
            "assigned_agents": [],
            "agent_states": [],
            "aggregated_output": {"error": str(exc)},
            "qa": None,
            "approval": None,
            "started_at": started_at,
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "version": FAOS_V6_VERSION,
        }
