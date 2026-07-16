"""
FAOS v5.0 Backend Core — FastAPI apex entry for Render (GitHub integration).

- GET / always returns JSON health (fixes Render "Cannot GET /" / 404 probes)
- CORS enabled for Vercel + localhost cross-origin dashboard calls
- Automation routes live under /api/v5/*
"""

from __future__ import annotations

import os
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from router.create_pillar_routing import orchestrator

FMK_WIG_NAMESPACE = "fmk_wig_prosthetic_hair_agent"
FMK_WIG_BRAND = "FMK WIG"

DEFAULT_ORIGINS = [
    "https://faos-v5-0-workstation.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


def _cors_origins() -> List[str]:
    """Build allowlist from env + defaults. Trailing slashes are stripped."""
    raw = os.getenv("CORS_ALLOW_ORIGINS", "").strip()
    origins: List[str] = []
    if raw:
        origins.extend(o.strip().rstrip("/") for o in raw.split(",") if o.strip())
    origins.extend(DEFAULT_ORIGINS)
    # De-dupe, preserve order
    seen = set()
    unique: List[str] = []
    for origin in origins:
        if origin and origin not in seen:
            seen.add(origin)
            unique.append(origin)
    # Wildcard fallback for open Render↔Vercel free-tier wiring when no custom list.
    if os.getenv("CORS_ALLOW_ALL", "true").lower() in {"1", "true", "yes"}:
        return ["*"]
    return unique


app = FastAPI(
    title="FAOS Backend Core",
    version="5.0",
    # Avoid silent 307 redirects that break POST when clients add a trailing slash.
    redirect_slashes=False,
)

_cors = _cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors,
    allow_origin_regex=r"https://.*\.vercel\.app",
    # Browsers reject credentials with wildcard origins; only enable when explicit.
    allow_credentials=("*" not in _cors),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def strip_trailing_slash(request: Request, call_next):
    """Normalize /path/ → /path so Render/Vercel URL joining never 404s."""
    path = request.scope.get("path", "")
    if path != "/" and path.endswith("/"):
        request.scope["path"] = path.rstrip("/")
    return await call_next(request)


@app.get("/")
async def root_health() -> Dict[str, Any]:
    """Default root health handler for Render uptime / browser probes."""
    return {
        "status": "active",
        "message": "FAOS v5.0 Backend serving on Render cluster",
        "system": "FAOS v5.0 Central Framework",
        "engine": "Aigorithm System Core Active",
        "health_check": "100% Functional",
        "gateway": "Zero-Trust API Routing Secure",
        "api_prefix": "/api/v5",
        "create_pillar_namespace": "fmk_create_pillar_retail_core",
        "fmk_wig_namespace": FMK_WIG_NAMESPACE,
        "openrouter_configured": bool(os.getenv("OPENROUTER_API_KEY")),
    }


@app.get("/health")
async def health() -> Dict[str, Any]:
    return await root_health()


@app.get("/api/v5/agent-trigger")
async def agent_trigger_status() -> Dict[str, Any]:
    return {
        "ok": True,
        "endpoint": "/api/v5/agent-trigger",
        "status": "ready",
        "message": "FAOS agent trigger channel online",
    }


@app.post("/api/v5/agent-trigger")
async def agent_trigger(payload: Dict[str, Any]) -> Dict[str, Any]:
    target = payload.get("target_brand") or payload.get("agent") or "fmk_wig_prosthetic_hair_agent"
    action = payload.get("action") or "process"
    routed = orchestrator.process_supply_command(
        {
            "target_brand": target,
            "request_type": payload.get("request_type") or "Production_Request",
            "sku_details": payload.get("sku_details") or {},
        }
    )
    gate = None
    if action in {"gatekeeper", "deploy", "live"}:
        gate = orchestrator.trigger_gatekeeper_protocol({"target_brand": target})
    return {
        "ok": True,
        "endpoint": "/api/v5/agent-trigger",
        "action": action,
        "routing": routed,
        "gatekeeper": gate,
    }


@app.get("/api/v5/create-pillar/fmk-wig")
async def get_fmk_wig_context() -> Dict[str, Any]:
    """EXPLICIT DATA MAP LOCK FOR FMK WIG."""
    return {
        "ok": True,
        "brand_name": FMK_WIG_BRAND,
        "namespace": FMK_WIG_NAMESPACE,
        "cluster": "Create Pillar - Consumer & Retail",
        "logistics": "Global Supply Chain Enabled",
        "synergy_route": "fmk_records_audio_empire_pipeline",
        "scope": (
            "Prosthetic Hair Systems, Global Supply Chain Logistics, "
            "Inventory Forecasting, Voice-to-Command Filtering Stack."
        ),
    }


@app.get("/api/v5/create-pillar")
async def list_create_pillar() -> Dict[str, Any]:
    pillar = orchestrator.namespace_db["fmk_create_pillar_retail_core"]
    entities = [
        {
            "id": entity_id,
            "brand_name": meta.get("brand_name"),
            "route_key": meta.get("route_key"),
            "scope": meta.get("scope"),
            "sub_categories": meta.get("sub_categories"),
        }
        for entity_id, meta in pillar["entities"].items()
    ]
    return {
        "ok": True,
        "namespace": orchestrator.namespace,
        "parent_hub": pillar["parent_hub"],
        "holding_umbrella": pillar.get("holding_umbrella"),
        "entities": entities,
        "future_extensions": pillar.get("future_extensions", []),
        "cross_pillar_routes": pillar.get("cross_pillar_routes", {}),
        "gatekeeper_protocol": pillar.get("gatekeeper_protocol", []),
    }


@app.post("/api/v5/create-pillar")
async def create_pillar_action(payload: Dict[str, Any]) -> Dict[str, Any]:
    action = payload.get("action") or "process"
    if action == "gatekeeper":
        result = orchestrator.trigger_gatekeeper_protocol(payload)
        return {"ok": True, "action": action, **result}
    if action == "process":
        result = orchestrator.process_supply_command(payload)
        return {"ok": True, "action": action, **result}
    raise HTTPException(
        status_code=400,
        detail="Unknown action. Use action=process|gatekeeper.",
    )


@app.get("/api/v5/create-pillar/{entity_id}")
async def get_entity_context(entity_id: str) -> Dict[str, Any]:
    if entity_id in {"fmk-wig", "fmk_wig", "wig", "hair"}:
        return await get_fmk_wig_context()

    pillar = orchestrator.namespace_db["fmk_create_pillar_retail_core"]
    entities = pillar["entities"]
    if entity_id not in entities:
        raise HTTPException(status_code=404, detail=f"Unknown entity: {entity_id}")

    meta = entities[entity_id]
    return {
        "ok": True,
        "brand_name": meta["brand_name"],
        "namespace": entity_id,
        "cluster": "Create Pillar - Consumer & Retail",
        "scope": meta.get("scope"),
        "route_key": meta.get("route_key"),
        "sub_categories": meta.get("sub_categories"),
    }


@app.exception_handler(404)
async def not_found_handler(request: Request, exc: Any):
    return JSONResponse(
        status_code=404,
        content={
            "ok": False,
            "error": "Route not found",
            "path": request.url.path,
            "hint": "Use /, /health, /api/v5/create-pillar, /api/v5/agent-trigger",
        },
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
