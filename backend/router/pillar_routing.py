"""FAOS multi-agent pillar router — CREATE · MEDIA · SERVICE.

Serves /api/v1/pillar/* namespaces. Secrets stay in process env only.
Locks FMK WIG prosthetic hair agent; never fmk_week / fmcg_wish aliases.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from router.create_pillar_routing import orchestrator as create_orchestrator
from router.orchestrate_routing import enqueue_media_job
from router.tac_routing import tac
from services.memory_namespaces import (
    append_memory,
    list_namespace_ids,
    load_group_core,
    resolve_namespace,
)

logger = logging.getLogger("FAOS_Pillar_Router")

FMK_WIG_NAMESPACE = "fmk_wig_prosthetic_hair_agent"
FORBIDDEN = {"fmk_week", "fmk_fmcg_week_supply_agent", "fmcg_wish", "FMK Week", "FMCG Wish"}

PILLAR_ALIASES = {
    "create": "create",
    "media": "media",
    "service": "service",
    "connect": "service",
    "capital": "service",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_pillar(pillar_id: str) -> str:
    key = (pillar_id or "").strip().lower()
    if key not in PILLAR_ALIASES:
        raise ValueError(f"Unknown pillar '{pillar_id}'. Use create | media | service.")
    return PILLAR_ALIASES[key]


class PillarRouter:
    """Dynamic multi-agent routing across CREATE / MEDIA / SERVICE pillars."""

    def catalog(self) -> Dict[str, Any]:
        core = load_group_core()
        pillars_out: List[Dict[str, Any]] = []
        for key in ("create", "media", "service"):
            pillar = (core.get("pillars") or {}).get(key) or {}
            namespaces = [
                {
                    "id": ns.get("id"),
                    "label": ns.get("label"),
                    "agent_ref": ns.get("agent_ref"),
                }
                for ns in (pillar.get("memory_namespaces") or [])
            ]
            pillars_out.append(
                {
                    "id": key,
                    "name": pillar.get("name") or key.upper(),
                    "parent_brand": pillar.get("parent_brand"),
                    "namespace": pillar.get("namespace"),
                    "memory_namespaces": namespaces,
                    "routes": {
                        "status": f"/api/v1/pillar/{key}",
                        "route": f"/api/v1/pillar/{key}/route",
                        "agents": f"/api/v1/pillar/{key}/agents",
                    },
                }
            )
        return {
            "ok": True,
            "framework": "FAOS Multi-Agent Pillar Router",
            "version": "5.3.0",
            "core_id": core.get("core_id", "fmk_group_ltd_core"),
            "pillars": pillars_out,
            "locks": {
                "fmk_wig": FMK_WIG_NAMESPACE,
                "forbidden_aliases": sorted(FORBIDDEN),
                "bulletseye": "fmk_bulletseye_core_namespace",
            },
            "secrets": {
                "openrouter": "configured" if os.getenv("OPENROUTER_API_KEY") else "missing",
                "gemini": "configured" if os.getenv("GEMINI_API_KEY") else "missing",
                "meta": "configured" if os.getenv("META_API_KEY") else "missing",
                "openai_direct": "configured" if os.getenv("OPENAI_API_KEY") else "missing",
            },
            "mode": "24/7 Active",
            "api_prefixes": ["/api/v1", "/api/v5"],
            "source": "render",
        }

    def status(self, pillar_id: str) -> Dict[str, Any]:
        key = _normalize_pillar(pillar_id)
        core = load_group_core()
        pillar = (core.get("pillars") or {}).get(key) or {}
        return {
            "ok": True,
            "pillar": key,
            "name": pillar.get("name") or key.upper(),
            "parent_brand": pillar.get("parent_brand"),
            "parent_role": pillar.get("parent_role"),
            "namespace": pillar.get("namespace"),
            "memory_namespaces": pillar.get("memory_namespaces") or [],
            "pipelines": pillar.get("pipelines"),
            "agent_count": len(pillar.get("memory_namespaces") or []),
            "mode": "24/7 Active",
            "timestamp": _now(),
        }

    def agents(self, pillar_id: str) -> Dict[str, Any]:
        key = _normalize_pillar(pillar_id)
        core = load_group_core()
        pillar = (core.get("pillars") or {}).get(key) or {}
        agents = []
        for ns in pillar.get("memory_namespaces") or []:
            agents.append(
                {
                    "memory_ns": ns.get("id"),
                    "label": ns.get("label"),
                    "agent_ref": ns.get("agent_ref"),
                    "resolved": bool(resolve_namespace(str(ns.get("id") or ""))),
                }
            )
        return {
            "ok": True,
            "pillar": key,
            "agents": agents,
            "total": len(agents),
            "known_namespaces": list_namespace_ids(),
        }

    def route(self, pillar_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Route a command/job into the correct pillar with graceful fallbacks."""
        key = _normalize_pillar(pillar_id)
        command = str(
            payload.get("command")
            or payload.get("message")
            or payload.get("prompt")
            or ""
        ).strip()
        if not command:
            raise ValueError("command is required")

        brand = payload.get("brand") or payload.get("target_brand")
        if isinstance(brand, str) and brand in FORBIDDEN:
            brand = FMK_WIG_NAMESPACE

        fallback_used = False
        try:
            if key == "create":
                result = self._create_route(command, brand, payload)
            elif key == "media":
                result = self._media_route(command, payload)
            else:
                result = self._service_route(command, brand, payload)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Pillar %s route failed, offline fallback: %s", key, exc)
            fallback_used = True
            result = {
                "ok": True,
                "fallback": True,
                "pillar": key,
                "message": f"Offline fallback for {key} pillar — queued for next autonomous tick",
                "error": str(exc)[:300],
                "command": command[:500],
            }

        ns = {
            "create": "fmk_wig_prosthetic",
            "media": "fmk_editing_hub",
            "service": "fmk_aigorithm_ai_brain",
        }[key]
        try:
            mem = append_memory(
                ns,
                kind="pillar_route",
                content=f"[{key}] {command[:2000]}",
                source="api_v1_pillar",
                meta={"pillar": key, "fallback": fallback_used},
            )
            result["memory_entry_id"] = mem.get("id")
        except Exception as mem_exc:  # noqa: BLE001
            logger.warning("Memory append skipped: %s", mem_exc)
            result["memory_skipped"] = True

        return {
            "ok": True,
            "pillar": key,
            "mode": "24/7 Active",
            "fallback_used": fallback_used,
            "timestamp": _now(),
            "result": result,
        }

    def _create_route(
        self, command: str, brand: Optional[str], payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        target = brand if isinstance(brand, str) else FMK_WIG_NAMESPACE
        routed = create_orchestrator.process_supply_command(
            {
                "target_brand": target,
                "request_type": payload.get("request_type") or "Production_Request",
                "sku_details": payload.get("sku_details")
                or payload.get("sku_data")
                or {"note": command[:500]},
            }
        )
        return {
            "ok": True,
            "pillar": "create",
            "action": "create_pillar_route",
            "command": command[:500],
            "routing": routed,
            "openrouter_configured": bool(os.getenv("OPENROUTER_API_KEY")),
        }

    def _media_route(self, command: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        job = enqueue_media_job(
            {
                "source_brand": payload.get("source_brand") or "fmk_media",
                "asset_type": payload.get("asset_type") or "content_brief",
                "target_pipeline": payload.get("target_pipeline") or "fmk_editing_hub",
                "title": (payload.get("title") or command)[:300],
                "notes": command[:2000],
            }
        )
        return {
            "ok": True,
            "pillar": "media",
            "action": "media_enqueue",
            "job": job,
            "pipeline": "fmk_editing_hub",
        }

    def _service_route(
        self, command: str, brand: Optional[str], payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        try:
            dispatched = tac.dispatch_command(
                {
                    "command": command,
                    "pillar_id": payload.get("tac_pillar") or "connect",
                    "priority": payload.get("priority") or "normal",
                }
            )
            return {
                "ok": True,
                "pillar": "service",
                "action": "tac_dispatch",
                "dispatch": dispatched,
            }
        except Exception as exc:  # noqa: BLE001
            return {
                "ok": True,
                "pillar": "service",
                "action": "aigorithm_note",
                "fallback": True,
                "message": "TAC unavailable — noted for Aigorithm brain",
                "detail": str(exc)[:200],
                "brand": brand,
                "command": command[:500],
            }


pillar_router = PillarRouter()
