"""FAOS v6.0 — Ingestion layer for client briefs (Python)."""

from __future__ import annotations

import re
import time
from typing import Any, Dict, List, Optional, Tuple

CATEGORY_HINTS: List[Tuple[str, List[re.Pattern[str]]]] = [
    ("smm", [re.compile(r"social|instagram|facebook|tiktok|hashtag|smm|content calendar", re.I)]),
    (
        "performance_marketing",
        [re.compile(r"ads?|media buy|roas|cpc|performance|campaign|google ads|meta ads", re.I)],
    ),
    ("video_scripting", [re.compile(r"video|reel|script|storyboard|youtube|capcut", re.I)]),
    ("design_brief", [re.compile(r"design|banner|logo|creative|visual|brand kit", re.I)]),
    ("seo_geo", [re.compile(r"seo|geo|fan-?out|schema|citation|ai overview|bulletseye", re.I)]),
]


def detect_task_category(text: str) -> str:
    for category, patterns in CATEGORY_HINTS:
        if any(p.search(text) for p in patterns):
            return category
    return "general"


def ingest_client_brief(input_data: Dict[str, Any]) -> Dict[str, Any]:
    details = str(input_data.get("details") or "").strip()
    if not details:
        raise ValueError("Brief details are required")

    category = input_data.get("category") or detect_task_category(details)
    title = str(input_data.get("title") or "").strip() or (
        f"{str(category).replace('_', ' ')} · {details[:48]}"
    )

    return {
        "brief_id": f"brief_{int(time.time() * 1000):x}",
        "brand": input_data.get("brand") or "BulletsEye",
        "category": category,
        "title": title,
        "details": details,
        "priority": input_data.get("priority") or "normal",
        "agent_ids": input_data.get("agent_ids"),
        "client_facing": input_data.get("client_facing", True),
        "metadata": input_data.get("metadata"),
    }
