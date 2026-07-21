"""FAOS v5.0 — Jarvis Central Brain memory nodes."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict


def _load_json(name: str) -> Dict[str, Any]:
    here = Path(__file__).resolve()
    for base in (here.parents[1] / "data", here.parents[2] / "data"):
        path = base / name
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    return {}


class BrainMemoryService:
    def status(self) -> Dict[str, Any]:
        root = _load_json("fmk_jarvis_brain_memory.json").get("fmk_jarvis_brain_memory", {})
        nodes = root.get("nodes", {})
        return {
            "ok": True,
            "parent_hub": root.get("parent_hub"),
            "nodes": [
                {
                    "id": node_id,
                    "brand": meta.get("brand"),
                    "type": meta.get("type"),
                    "dashboard": (meta.get("routes") or {}).get("dashboard"),
                }
                for node_id, meta in nodes.items()
            ],
            "source": "render",
        }

    def get_node(self, node_id: str) -> Dict[str, Any]:
        root = _load_json("fmk_jarvis_brain_memory.json").get("fmk_jarvis_brain_memory", {})
        node = (root.get("nodes") or {}).get(node_id)
        if not node:
            raise ValueError(f"Unknown brain node: {node_id}")
        return {"ok": True, "id": node_id, **node}


brain = BrainMemoryService()
