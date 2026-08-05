"""FAOS v6.0 API surface for Render — diagnostics + pipeline + Jarvis route."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from faos_core.orchestrator.health import audit_agent_definitions, health_snapshot
from faos_core.orchestrator.jarvis_engine import jarvis_network_status, jarvis_route
from faos_core.pipelines.client_task_pipeline import run_client_task_pipeline
from faos_core.types import FAOS_V6_VERSION


class FaosV6Router:
    version = FAOS_V6_VERSION

    def status(self) -> Dict[str, Any]:
        return {
            "ok": True,
            **jarvis_network_status(),
            "endpoints": {
                "GET": "/api/v5/faos-v6?view=status|health|diagnostics",
                "POST": "{ action: diagnostics|pipeline|route, ... }",
            },
        }

    def diagnostics(self) -> Dict[str, Any]:
        report = audit_agent_definitions()
        return {
            "ok": report["ok"],
            "version": FAOS_V6_VERSION,
            "diagnostics": report,
        }

    def health(self) -> Dict[str, Any]:
        return {"ok": True, **health_snapshot()}

    async def pipeline(
        self,
        *,
        details: str,
        title: Optional[str] = None,
        brand: Optional[str] = None,
        category: Optional[str] = None,
        agent_ids: Optional[List[str]] = None,
        auto_approve: bool = True,
    ) -> Dict[str, Any]:
        result = await run_client_task_pipeline(
            {
                "details": details,
                "title": title,
                "brand": brand,
                "category": category,
                "agent_ids": agent_ids,
            },
            auto_approve=auto_approve,
            brand=brand,
        )
        return {"ok": result["ok"], "version": FAOS_V6_VERSION, "result": result}

    async def route(
        self,
        *,
        input_text: str,
        mode: str = "auto",
        agent_ids: Optional[List[str]] = None,
        brand: Optional[str] = None,
        auto_approve: bool = True,
    ) -> Dict[str, Any]:
        routed = await jarvis_route(
            input_text,
            mode=mode,
            agent_ids=agent_ids,
            brand=brand,
            auto_approve=auto_approve,
        )
        return {"ok": True, "version": FAOS_V6_VERSION, "result": routed}


faos_v6 = FaosV6Router()
