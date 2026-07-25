"""Isolated multi-agent memory namespaces under fmk_group_ltd_core.

Each shell company gets its own JSON memory file under data/memory_namespaces/.
Secrets are never persisted — redact before write.
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

SECRET_PATTERNS = [
    re.compile(r"\bsk-or-v1-[a-zA-Z0-9_-]{8,}\b", re.I),
    re.compile(r"\bAIza[0-9A-Za-z\-_]{20,}\b"),
    re.compile(
        r"\b(api[_-]?key|secret|token|password|DATABASE_URL)\s*[:=]\s*['\"]?[^\s'\"]{8,}",
        re.I,
    ),
]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _data_roots() -> List[Path]:
    here = Path(__file__).resolve()
    return [here.parents[1] / "data", here.parents[2] / "data"]


def load_group_core() -> Dict[str, Any]:
    for base in _data_roots():
        path = base / "fmk_group_ltd_core.json"
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    return {"core_id": "fmk_group_ltd_core", "pillars": {}}


def _memory_dir() -> Path:
    for base in _data_roots():
        if base.exists() or base == _data_roots()[0]:
            target = base / "memory_namespaces"
            target.mkdir(parents=True, exist_ok=True)
            return target
    fallback = _data_roots()[0] / "memory_namespaces"
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback


def _sanitize(value: Any) -> Any:
    if isinstance(value, str):
        out = value
        for pattern in SECRET_PATTERNS:
            out = pattern.sub("[REDACTED]", out)
        return out
    if isinstance(value, list):
        return [_sanitize(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _sanitize(v) for k, v in value.items()}
    return value


def list_namespace_ids() -> List[str]:
    core = load_group_core()
    ids: List[str] = []
    for pillar in (core.get("pillars") or {}).values():
        for ns in pillar.get("memory_namespaces") or []:
            nid = ns.get("id")
            if nid:
                ids.append(str(nid))
    return ids


def resolve_namespace(ns_id: str) -> Optional[Dict[str, Any]]:
    core = load_group_core()
    needle = ns_id.strip()
    for pillar_key, pillar in (core.get("pillars") or {}).items():
        for ns in pillar.get("memory_namespaces") or []:
            if ns.get("id") == needle or ns.get("alias") == needle:
                return {
                    **ns,
                    "pillar": pillar_key,
                    "pillar_name": pillar.get("name"),
                    "core_id": core.get("core_id", "fmk_group_ltd_core"),
                }
    return None


def _ns_path(ns_id: str) -> Path:
    safe = re.sub(r"[^a-zA-Z0-9_\-]", "_", ns_id.strip())[:80]
    return _memory_dir() / f"{safe}.json"


def load_memory(ns_id: str) -> Dict[str, Any]:
    meta = resolve_namespace(ns_id)
    path = _ns_path(ns_id if not meta else str(meta["id"]))
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {
        "namespace": meta["id"] if meta else ns_id,
        "pillar": meta.get("pillar") if meta else None,
        "label": meta.get("label") if meta else ns_id,
        "entries": [],
        "updated_at": None,
    }


def append_memory(
    ns_id: str,
    *,
    kind: str,
    content: str,
    source: str = "system",
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    resolved = resolve_namespace(ns_id)
    canonical = str(resolved["id"]) if resolved else ns_id
    db = load_memory(canonical)
    entry = {
        "id": f"mem_{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "kind": kind[:80],
        "content": _sanitize(content)[:8000],
        "source": source[:120],
        "meta": _sanitize(meta or {}),
        "created_at": _now(),
    }
    entries = list(db.get("entries") or [])
    entries.insert(0, entry)
    db["entries"] = entries[:500]
    db["namespace"] = canonical
    db["pillar"] = resolved.get("pillar") if resolved else db.get("pillar")
    db["label"] = resolved.get("label") if resolved else db.get("label")
    db["updated_at"] = _now()
    path = _ns_path(canonical)
    path.write_text(json.dumps(db, indent=2), encoding="utf-8")
    return entry


def memory_status() -> Dict[str, Any]:
    core = load_group_core()
    pillars_out: Dict[str, Any] = {}
    for key, pillar in (core.get("pillars") or {}).items():
        namespaces = []
        for ns in pillar.get("memory_namespaces") or []:
            mem = load_memory(str(ns["id"]))
            namespaces.append(
                {
                    "id": ns["id"],
                    "alias": ns.get("alias"),
                    "label": ns.get("label"),
                    "entries": len(mem.get("entries") or []),
                    "updated_at": mem.get("updated_at"),
                }
            )
        pillars_out[key] = {
            "name": pillar.get("name"),
            "parent_brand": pillar.get("parent_brand"),
            "namespace": pillar.get("namespace"),
            "memory_namespaces": namespaces,
        }
    return {
        "ok": True,
        "core_id": core.get("core_id", "fmk_group_ltd_core"),
        "engine": core.get("engine", "JARVIS MATRIX V5.0"),
        "pillars": pillars_out,
        "openrouter_configured": bool(os.getenv("OPENROUTER_API_KEY")),
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "database_configured": bool(os.getenv("DATABASE_URL")),
    }
