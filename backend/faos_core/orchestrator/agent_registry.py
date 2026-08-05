"""FAOS v6.0 — Agent registry over shell_agents.json."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from faos_core.types import EXPECTED_SHELL_AGENT_COUNT, ORCHESTRATOR_ID, AgentState

_DATA_CANDIDATES = [
    Path(__file__).resolve().parents[2] / "data" / "shell_agents.json",
    Path(__file__).resolve().parents[3] / "data" / "shell_agents.json",
]

_STATE: Dict[str, AgentState] = {}
_CACHE: Optional[Dict[str, Any]] = None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load() -> Dict[str, Any]:
    global _CACHE
    if _CACHE is not None:
        return _CACHE
    for path in _DATA_CANDIDATES:
        if path.exists():
            _CACHE = json.loads(path.read_text(encoding="utf-8"))
            return _CACHE
    _CACHE = {"version": "6.0.0", "orchestrator": ORCHESTRATOR_ID, "agents": []}
    return _CACHE


def get_registry_version() -> str:
    return str(_load().get("version", "unknown"))


def get_orchestrator_id() -> str:
    return str(_load().get("orchestrator", ORCHESTRATOR_ID))


def list_agents() -> List[Dict[str, Any]]:
    return list(_load().get("agents") or [])


def get_agent(agent_id: str) -> Optional[Dict[str, Any]]:
    return next((a for a in list_agents() if a.get("id") == agent_id), None)


def _idle(agent_id: str) -> AgentState:
    return {
        "agent_id": agent_id,
        "status": "idle",
        "current_task": None,
        "output": None,
        "timestamp": _now(),
    }


def ensure_agent_states() -> List[AgentState]:
    for agent in list_agents():
        aid = str(agent.get("id"))
        if aid not in _STATE:
            _STATE[aid] = _idle(aid)
    return [_STATE[str(a.get("id"))] for a in list_agents()]


def set_agent_state(agent_id: str, **patch: Any) -> AgentState:
    prev = _STATE.get(agent_id) or _idle(agent_id)
    next_state: AgentState = {**prev, **patch, "agent_id": agent_id}  # type: ignore[misc]
    next_state["timestamp"] = str(patch.get("timestamp") or _now())
    _STATE[agent_id] = next_state
    return next_state


def match_agents(text: str, limit: int = 4) -> List[Dict[str, Any]]:
    lower = text.lower()
    orch = get_orchestrator_id()
    scored = []
    for agent in list_agents():
        score = 0
        for kw in agent.get("keywords") or []:
            if str(kw).lower() in lower:
                score += 2
        if agent.get("id", "").replace("_", " ") in lower:
            score += 1
        domain = str(agent.get("domain") or "")
        if domain and domain != "orchestration" and domain in lower:
            score += 1
        if score > 0 and agent.get("id") != orch:
            scored.append((score, agent))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [a for _, a in scored[:limit]]


def registry_stats() -> Dict[str, Any]:
    agents = list_agents()
    return {
        "version": get_registry_version(),
        "orchestrator": get_orchestrator_id(),
        "found": len(agents),
        "expected": EXPECTED_SHELL_AGENT_COUNT,
        "domains": sorted({str(a.get("domain")) for a in agents}),
    }
