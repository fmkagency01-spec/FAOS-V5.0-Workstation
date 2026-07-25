"""Interactive Learning Hub — TAC / Aigorithm knowledge ingestion.

POST /api/v5/learning-hub pushes documentation, URLs, or courses into
isolated memory namespaces under fmk_group_ltd_core.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from services.memory_namespaces import append_memory, resolve_namespace

ALLOWED_KINDS = {"documentation", "url", "course", "note", "policy"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _data_dir() -> Path:
    here = Path(__file__).resolve()
    for base in (here.parents[1] / "data", here.parents[2] / "data"):
        target = base / "learning_hub"
        target.mkdir(parents=True, exist_ok=True)
        return target
    fallback = here.parents[1] / "data" / "learning_hub"
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback


def _db_path() -> Path:
    return _data_dir() / "learning_hub_db.json"


def _load() -> Dict[str, Any]:
    path = _db_path()
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {"table": "learning_hub", "version": 1, "items": []}


def _save(db: Dict[str, Any]) -> None:
    _db_path().write_text(json.dumps(db, indent=2), encoding="utf-8")


def _uid() -> str:
    return f"lh_{uuid.uuid4().hex[:12]}"


class LearningHubService:
    def status(self) -> Dict[str, Any]:
        db = _load()
        items = db.get("items") or []
        pending = [i for i in items if i.get("status") == "pending"]
        ingested = [i for i in items if i.get("status") == "ingested"]
        return {
            "ok": True,
            "module": "learning_hub",
            "gatekeeper": "fmk_tac_core",
            "brain": "fmk_aigorithm_ai_brain",
            "total": len(items),
            "pending": len(pending),
            "ingested": len(ingested),
            "source": "render",
        }

    def list_items(self, limit: int = 100) -> List[Dict[str, Any]]:
        items = _load().get("items") or []
        return sorted(items, key=lambda x: x.get("updated_at", ""), reverse=True)[
            : max(1, min(limit, 500))
        ]

    def push(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        title = str(payload.get("title") or "").strip()
        if not title:
            raise ValueError("title is required")

        kind = str(payload.get("kind") or "documentation").strip().lower()
        if kind not in ALLOWED_KINDS:
            raise ValueError(f"kind must be one of {sorted(ALLOWED_KINDS)}")

        content = str(payload.get("content") or payload.get("body") or "").strip()
        url = str(payload.get("url") or "").strip()
        if kind == "url" and not url:
            raise ValueError("url is required when kind=url")
        if kind != "url" and not content and not url:
            raise ValueError("content or url is required")

        ns = str(payload.get("memory_namespace") or "fmk_aigorithm_ai_brain").strip()
        if not resolve_namespace(ns):
            # Allow push even if alias unknown — default to aigorithm brain
            ns = "fmk_aigorithm_ai_brain"

        auto_ingest = bool(payload.get("auto_ingest", True))
        ts = _now()
        item = {
            "id": _uid(),
            "title": title[:300],
            "kind": kind,
            "url": url[:2000] if url else None,
            "content": content[:20000] if content else None,
            "memory_namespace": ns,
            "pillar_hint": payload.get("pillar") or "service",
            "tags": [
                str(t).strip()[:80]
                for t in (payload.get("tags") or [])
                if str(t).strip()
            ][:20],
            "status": "pending",
            "submitted_by": str(payload.get("submitted_by") or "admin")[:120],
            "created_at": ts,
            "updated_at": ts,
            "ingest_result": None,
        }

        db = _load()
        db.setdefault("items", []).insert(0, item)
        _save(db)

        if auto_ingest:
            item = self.ingest(item["id"])
        return item

    def ingest(self, item_id: str) -> Dict[str, Any]:
        db = _load()
        row = next((i for i in db.get("items") or [] if i.get("id") == item_id), None)
        if not row:
            raise ValueError(f"Learning hub item not found: {item_id}")

        summary_parts = [f"[{row.get('kind')}] {row.get('title')}"]
        if row.get("url"):
            summary_parts.append(f"URL: {row['url']}")
        if row.get("content"):
            summary_parts.append(str(row["content"])[:4000])
        text = "\n".join(summary_parts)

        mem = append_memory(
            str(row.get("memory_namespace") or "fmk_aigorithm_ai_brain"),
            kind=f"learning_{row.get('kind')}",
            content=text,
            source="learning_hub",
            meta={
                "learning_hub_id": row["id"],
                "tags": row.get("tags") or [],
                "url": row.get("url"),
            },
        )
        row["status"] = "ingested"
        row["updated_at"] = _now()
        row["ingest_result"] = {
            "memory_entry_id": mem.get("id"),
            "namespace": row.get("memory_namespace"),
        }
        _save(db)
        return dict(row)

    def ingest_pending(self, limit: int = 10) -> Dict[str, Any]:
        pending = [i for i in self.list_items(200) if i.get("status") == "pending"][
            :limit
        ]
        results = []
        for item in pending:
            try:
                results.append(self.ingest(str(item["id"])))
            except ValueError as exc:
                results.append({"id": item.get("id"), "error": str(exc)})
        return {"ok": True, "processed": len(results), "items": results}


learning_hub = LearningHubService()
