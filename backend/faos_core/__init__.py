"""FAOS v6.0 Python core — Render parity for orchestrator / agents / pipelines."""

from .orchestrator.health import audit_agent_definitions, health_snapshot
from .orchestrator.jarvis_engine import jarvis_route, jarvis_network_status
from .pipelines.client_task_pipeline import run_client_task_pipeline

__all__ = [
    "audit_agent_definitions",
    "health_snapshot",
    "jarvis_route",
    "jarvis_network_status",
    "run_client_task_pipeline",
]

FAOS_V6_VERSION = "6.0.0"
EXPECTED_SHELL_AGENT_COUNT = 36
