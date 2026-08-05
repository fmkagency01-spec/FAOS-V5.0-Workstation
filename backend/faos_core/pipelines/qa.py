"""FAOS v6.0 — Internal QA layer (Python)."""

from __future__ import annotations

import re
from typing import Any, Dict


def evaluate_deliverable(
    brief: Dict[str, Any], combined_text: str, agent_count: int
) -> Dict[str, Any]:
    text = combined_text or ""
    category = str(brief.get("category") or "general").replace("_", " ")
    details = str(brief.get("details") or "")

    benchmarks = [
        {
            "name": "non_empty",
            "passed": len(text.strip()) >= 40,
            "detail": "Deliverable has substantive content",
        },
        {
            "name": "agent_coverage",
            "passed": agent_count >= 1,
            "detail": "At least one agent produced output",
        },
        {
            "name": "brief_alignment",
            "passed": (
                category[:6].lower() in text.lower()
                or details[:12].lower() in text.lower()
                or len(text) > 120
            ),
            "detail": "Output relates to brief category/details",
        },
        {
            "name": "client_safe_length",
            "passed": len(text) <= 50_000,
            "detail": "Deliverable within publishable size",
        },
        {
            "name": "no_forbidden_namespace",
            "passed": not re.search(
                r"fmk_week|fmcg_wish|fmk_fmcg_week_supply_agent", text, re.I
            ),
            "detail": "No forbidden FMK namespaces in output",
        },
    ]

    passed_count = sum(1 for b in benchmarks if b["passed"])
    score = round((passed_count / len(benchmarks)) * 100)
    threshold = 80 if brief.get("priority") == "high" else 60

    return {
        "score": score,
        "passed": score >= threshold,
        "benchmarks": benchmarks,
    }
