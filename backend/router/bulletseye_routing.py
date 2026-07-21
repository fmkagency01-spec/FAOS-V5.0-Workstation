"""
FAOS v5.0 — BulletsEye SEO & GEO Autonomous Agent Squad

Namespace: fmk_bulletseye_core_namespace
Agents:
  fmk_seo_lead_agent
  fmk_geo_engine_agent
  fmk_schema_backend_agent
  fmk_website_injector_agent
"""

from __future__ import annotations

import json
import logging
import os
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from router.ai_seo_routing import engine as ai_seo_engine

logger = logging.getLogger("FAOS_BulletsEye_Squad")

BULLETSEYE_NAMESPACE = "fmk_bulletseye_core_namespace"
INJECT_WEBHOOK_KEY = os.getenv("BULLETSEYE_INJECT_WEBHOOK_KEY", "")

SQUAD_AGENTS = {
    "seo_lead": "fmk_seo_lead_agent",
    "geo_engine": "fmk_geo_engine_agent",
    "schema_backend": "fmk_schema_backend_agent",
    "website_injector": "fmk_website_injector_agent",
}

INTERNAL_ROUTES = {
    "fmk_wig_prosthetic_hair_agent": "/products/fmk-wig",
    "fmk_mk_clothing_lifestyle_agent": "/products",
    "fmk_shoes_footwear_wing": "/products",
    "takabachaw_fintech_agent": "/products",
}

SECRET_PATTERNS = [
    re.compile(r"\bsk-or-v1-[a-zA-Z0-9_-]{8,}\b", re.I),
    re.compile(r"\b(api[_-]?key|secret|token|password)\s*[:=]\s*['\"]?[^\s'\"]{8,}", re.I),
]


def _store_dir() -> Path:
    here = Path(__file__).resolve()
    for base in (here.parents[1] / "data", here.parents[2] / "data"):
        target = base / "bulletseye_injections"
        target.mkdir(parents=True, exist_ok=True)
        return target
    fallback = here.parents[1] / "data" / "bulletseye_injections"
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback


def _slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:64]


def _sanitize_text(text: str) -> str:
    out = text
    for pattern in SECRET_PATTERNS:
        out = pattern.sub("[REDACTED]", out)
    return out


def _sanitize_json(value: Any) -> Any:
    if isinstance(value, str):
        return _sanitize_text(value)
    if isinstance(value, list):
        return [_sanitize_json(v) for v in value]
    if isinstance(value, dict):
        clean: Dict[str, Any] = {}
        for key, val in value.items():
            lower = key.lower()
            if any(x in lower for x in ("api_key", "apikey", "secret", "token", "password")):
                continue
            clean[key] = _sanitize_json(val)
        return clean
    return value


def _resolve_target_url(brand_id: str, explicit: Optional[str]) -> str:
    if explicit and explicit.strip():
        return explicit.strip()
    internal = INTERNAL_ROUTES.get(brand_id)
    if internal:
        site = os.getenv("NEXT_PUBLIC_SITE_URL", "https://faos-v5-0-workstation.vercel.app").rstrip("/")
        return f"{site}{internal}"
    return ""


def _build_metadata(brand_name: str, topic: str, fan_out: Dict[str, Any]) -> Dict[str, Any]:
    queries = fan_out.get("fan_out_queries") or []
    description = (
        queries[0].get("direct_answer")
        if queries
        else f"{brand_name} — {topic} · AI SEO / GEO optimized."
    )
    title = f"{brand_name} — {topic} | FAOS BulletsEye"
    return {
        "title": str(title)[:120],
        "description": str(description)[:300],
        "openGraph": {
            "title": str(title)[:120],
            "description": str(description)[:300],
        },
    }


class BulletseyeSquadOrchestrator:
    def squad_status(self) -> Dict[str, Any]:
        return {
            "ok": True,
            "namespace": BULLETSEYE_NAMESPACE,
            "squad": "BulletsEye SEO & GEO Autonomous Agent Squad",
            "agents": list(SQUAD_AGENTS.values()),
            "endpoint": "/api/v5/bulletseye/seo-geo-execute",
            "internal_routes": INTERNAL_ROUTES,
        }

    def execute(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        brand_name = payload.get("brand_name")
        brand_id = payload.get("brand_id")
        if not brand_name and not brand_id:
            raise ValueError("Provide brand_name or brand_id.")

        fan_out = ai_seo_engine.generate_fan_out(
            {
                "brand_name": brand_name,
                "brand_id": brand_id,
                "client_topic": payload.get("client_topic") or payload.get("query_type"),
                "channel": payload.get("client_type"),
                "use_llm": payload.get("use_llm", True),
            }
        )

        resolved_brand_id = fan_out.get("brand_id", "fmk_wig_prosthetic_hair_agent")
        resolved_brand_name = fan_out.get("brand_name", "FMK WIG")
        client_type = payload.get("client_type") or fan_out.get("channel", "internal")
        query_type = payload.get("query_type") or fan_out.get("client_topic", "")
        auto_inject = bool(payload.get("auto_inject_flag"))
        target_url = _resolve_target_url(resolved_brand_id, payload.get("target_url"))

        schema_blocks = _sanitize_json(fan_out.get("schema_blocks") or [])
        direct_answers = [
            {"h2": q.get("recommended_h2"), "answer": q.get("direct_answer")}
            for q in fan_out.get("fan_out_queries") or []
        ]
        next_metadata = _build_metadata(
            resolved_brand_name, fan_out.get("client_topic", ""), fan_out
        )

        record_id = f"{_slugify(resolved_brand_name)}-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
        internal_route = INTERNAL_ROUTES.get(resolved_brand_id)

        record = {
            "id": record_id,
            "brand_name": resolved_brand_name,
            "brand_id": resolved_brand_id,
            "target_url": target_url,
            "client_type": client_type,
            "query_type": query_type,
            "stored_at": datetime.now(timezone.utc).isoformat(),
            "schema_blocks": schema_blocks,
            "recommended_h2_headers": fan_out.get("recommended_h2_headers", []),
            "direct_answers": direct_answers,
            "next_metadata": next_metadata,
            "injection_status": "stored",
            "internal_route": internal_route,
        }

        store_path = _store_dir() / f"{record_id}.json"
        store_path.write_text(json.dumps(record, indent=2), encoding="utf-8")

        pipeline: List[Dict[str, Any]] = [
            {
                "agent": SQUAD_AGENTS["seo_lead"],
                "status": "completed",
                "summary": f"Generated {len(fan_out.get('fan_out_queries') or [])} fan-out sub-queries.",
                "payload": {
                    "recommended_h2_headers": fan_out.get("recommended_h2_headers"),
                },
            },
            {
                "agent": SQUAD_AGENTS["geo_engine"],
                "status": "completed",
                "summary": f"Built {len(schema_blocks)} JSON-LD blocks.",
                "payload": {"schema_types": [b.get("type") for b in schema_blocks]},
            },
            {
                "agent": SQUAD_AGENTS["schema_backend"],
                "status": "completed",
                "summary": "Prepared sanitized Metadata + head JSON-LD pack.",
                "payload": {"record_id": record_id, "internal_route": internal_route},
            },
        ]

        injector_result: Optional[Dict[str, Any]] = None
        injection_status = "stored"

        if not auto_inject:
            pipeline.append(
                {
                    "agent": SQUAD_AGENTS["website_injector"],
                    "status": "skipped",
                    "summary": "auto_inject_flag=false — stored locally only.",
                }
            )
        elif not target_url:
            pipeline.append(
                {
                    "agent": SQUAD_AGENTS["website_injector"],
                    "status": "offline_fallback",
                    "summary": "No target_url — local store retained.",
                }
            )
            injection_status = "offline_fallback"
            injector_result = {"attempted": False, "target": "", "message": "Missing target_url"}
        else:
            inject_step, injector_result, injection_status = self._run_injector(
                record, target_url
            )
            pipeline.append(inject_step)

        record["injection_status"] = injection_status
        store_path.write_text(json.dumps(record, indent=2), encoding="utf-8")

        return {
            "ok": True,
            "namespace": BULLETSEYE_NAMESPACE,
            "execution_id": record_id,
            "brand_name": resolved_brand_name,
            "brand_id": resolved_brand_id,
            "target_url": target_url,
            "client_type": client_type,
            "query_type": query_type,
            "auto_inject_flag": auto_inject,
            "squad_pipeline": pipeline,
            "fan_out": {**fan_out, "schema_blocks": schema_blocks},
            "schema_blocks": schema_blocks,
            "next_metadata": next_metadata,
            "direct_answers": direct_answers,
            "storage": {
                "record_id": record_id,
                "path_hint": str(store_path),
                "injection_status": injection_status,
                "internal_route": internal_route,
            },
            "injector": injector_result,
            "source": "render",
        }

    def _run_injector(
        self, record: Dict[str, Any], target_url: str
    ) -> tuple[Dict[str, Any], Dict[str, Any], str]:
        body = json.dumps(
            {
                "brand_name": record["brand_name"],
                "brand_id": record["brand_id"],
                "schema_blocks": record["schema_blocks"],
                "recommended_h2_headers": record["recommended_h2_headers"],
                "direct_answers": record["direct_answers"],
                "next_metadata": record["next_metadata"],
                "source": BULLETSEYE_NAMESPACE,
                "record_id": record["id"],
            }
        ).encode("utf-8")

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "FAOS-BulletsEye-Injector/5.0",
        }
        if INJECT_WEBHOOK_KEY:
            headers["X-FAOS-Inject-Key"] = INJECT_WEBHOOK_KEY

        req = urllib.request.Request(target_url, data=body, headers=headers, method="POST")

        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                status = resp.status
            if 200 <= status < 300:
                return (
                    {
                        "agent": SQUAD_AGENTS["website_injector"],
                        "status": "completed",
                        "summary": f"Pushed schema pack to {target_url} (HTTP {status}).",
                    },
                    {
                        "attempted": True,
                        "target": target_url,
                        "http_status": status,
                        "message": "Remote injection accepted",
                    },
                    "pushed",
                )
            return (
                {
                    "agent": SQUAD_AGENTS["website_injector"],
                    "status": "offline_fallback",
                    "summary": f"Target responded {status} — local store retained.",
                },
                {
                    "attempted": True,
                    "target": target_url,
                    "http_status": status,
                    "message": "Target rejected payload; fallback to local store",
                },
                "offline_fallback",
            )
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            logger.warning("Website injector offline fallback: %s", exc)
            return (
                {
                    "agent": SQUAD_AGENTS["website_injector"],
                    "status": "offline_fallback",
                    "summary": f"Target offline ({exc}) — local store retained.",
                },
                {
                    "attempted": True,
                    "target": target_url,
                    "message": f"Offline fallback: {exc}",
                },
                "offline_fallback",
            )


squad = BulletseyeSquadOrchestrator()
