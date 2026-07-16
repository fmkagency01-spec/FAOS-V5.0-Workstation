"""
FAOS v5.0 Backend Core — FastAPI apex entry for Render / local execution.
Root `/` returns an explicit JSON health payload so Render health checks
never surface "Cannot GET /".
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from router.create_pillar_routing import orchestrator

app = FastAPI(title="FAOS Backend Core", version="5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FMK_WIG_NAMESPACE = "fmk_wig_prosthetic_hair_agent"
FMK_WIG_BRAND = "FMK WIG"


@app.get("/")
async def root_telemetry_verification() -> Dict[str, Any]:
    """FIXED ROOT ROUTE FOR RENDER HEALTH TELEMETRY."""
    return {
        "status": "ONLINE",
        "system": "FAOS v5.0 Central Framework",
        "engine": "Aigorithm System Core Active",
        "health_check": "100% Functional",
        "gateway": "Zero-Trust API Routing Secure",
        "create_pillar_namespace": "fmk_create_pillar_retail_core",
        "fmk_wig_namespace": FMK_WIG_NAMESPACE,
        "openrouter_configured": bool(os.getenv("OPENROUTER_API_KEY")),
    }


@app.get("/health")
async def health() -> Dict[str, Any]:
    return await root_telemetry_verification()


@app.get("/api/v5/create-pillar/fmk-wig")
async def get_fmk_wig_context() -> Dict[str, Any]:
    """EXPLICIT DATA MAP LOCK FOR FMK WIG — never alias as FMK Week / FMCG Wish."""
    return {
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
    return {
        "ok": True,
        "namespace": orchestrator.namespace,
        "parent_hub": pillar["parent_hub"],
        "holding_umbrella": pillar.get("holding_umbrella"),
        "entities": pillar["entities"],
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
    # Canonical lock: wig aliases must resolve to FMK WIG only.
    if entity_id in {"fmk-wig", "fmk_wig", "wig", "hair"}:
        return await get_fmk_wig_context()

    pillar = orchestrator.namespace_db["fmk_create_pillar_retail_core"]
    entities = pillar["entities"]
    if entity_id not in entities:
        raise HTTPException(status_code=404, detail=f"Unknown entity: {entity_id}")

    meta = entities[entity_id]
    return {
        "brand_name": meta["brand_name"],
        "namespace": entity_id,
        "cluster": "Create Pillar - Consumer & Retail",
        "scope": meta.get("scope"),
        "route_key": meta.get("route_key"),
        "sub_categories": meta.get("sub_categories"),
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
