"""FAOS v6.0 — Approval & delivery gate (Python)."""

from __future__ import annotations

from typing import Any, Dict, Optional

from faos_core.connectors.webhooks import deliver_webhook


def format_client_facing_output(
    brief: Dict[str, Any], combined_text: str, qa: Dict[str, Any]
) -> str:
    return "\n".join(
        [
            f"# {brief.get('title')}",
            "",
            f"**Brand:** {brief.get('brand') or 'BulletsEye'}",
            f"**Category:** {brief.get('category')}",
            f"**QA Score:** {qa.get('score')}/100 "
            f"({'PASS' if qa.get('passed') else 'NEEDS REVIEW'})",
            "",
            "## Brief",
            str(brief.get("details") or ""),
            "",
            "## Deliverable",
            (combined_text or "").strip(),
            "",
            "---",
            "_Prepared by FAOS v6.0 Approval Gate_",
        ]
    )


async def run_approval_gate(
    *,
    pipeline_id: str,
    brief: Dict[str, Any],
    combined_text: str,
    qa: Dict[str, Any],
    auto_approve: Optional[bool] = None,
) -> Dict[str, Any]:
    client_facing = format_client_facing_output(brief, combined_text, qa)

    if not qa.get("passed"):
        return {
            "status": "pending",
            "client_facing_output": client_facing,
            "ready_for_publish": False,
        }

    auto = True if auto_approve is None else bool(auto_approve)
    status = "auto_approved" if auto else "approved"
    webhook = await deliver_webhook(
        {
            "event": "faos.pipeline.approved",
            "pipeline_id": pipeline_id,
            "brand": brief.get("brand"),
            "body": {
                "title": brief.get("title"),
                "category": brief.get("category"),
                "qa_score": qa.get("score"),
                "output": client_facing,
            },
        }
    )

    return {
        "status": status,
        "client_facing_output": client_facing,
        "ready_for_publish": True,
        "webhook": webhook,
    }
