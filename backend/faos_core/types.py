"""FAOS v6.0 shared type constants (Python)."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, TypedDict

FAOS_V6_VERSION = "6.0.0"
EXPECTED_SHELL_AGENT_COUNT = 38  # 37 specialists + Hermes Co-Founder (3 Jarvis Brain hubs)
ORCHESTRATOR_ID = "jarvis_core"
HERMES_COFOUNDER_ID = "hermes_cofounder_agent"

AgentStatus = Literal[
    "idle", "queued", "running", "completed", "failed", "fallback", "timeout"
]


class AgentState(TypedDict, total=False):
    agent_id: str
    status: str
    current_task: Optional[str]
    output: Optional[Dict[str, Any]]
    timestamp: str
    error: str
    latency_ms: float


class DiagnosticsFinding(TypedDict):
    agent_id: str
    ok: bool
    issues: List[str]
    domain: Optional[str]
    name: Optional[str]
