"""
FAOS v5.0 Backend Core — FastAPI apex entry for Render (GitHub integration).

- GET / always returns JSON health (fixes Render "Cannot GET /" / 404 probes)
- CORS enabled for Vercel + localhost cross-origin dashboard calls
- Automation routes live under /api/v5/*
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

from router.create_pillar_routing import orchestrator
from router.ai_seo_routing import engine as ai_seo_engine
from router.bulletseye_routing import squad as bulletseye_squad
from router.brain_routing import brain
from router.b2b_wig_routing import b2b_wig
from router.harness_routing import harness
from router.erp_routing import erp
from router.tac_routing import tac
from router.workflow_routing import workflow
from middleware.auth import BackendAuthMiddleware
from middleware.errors import RequestIdMiddleware, register_exception_handlers
from middleware.rate_limit import RateLimitMiddleware
from schemas.erp import (
    EmployeeCreate,
    EmployeeUpdate,
    InventoryCreate,
    InventoryUpdate,
    InvoiceCreate,
    InvoiceUpdate,
    OrderCreate,
    OrderUpdate,
    ProductCreate,
    ProductUpdate,
    WorkLogCreate,
    WorkLogUpdate,
)
from schemas.notifications import NotifyRequest
from schemas.workflow import AgentAssign, ClientCreate, ClientUpdate, ProjectCreate, ProjectUpdate
from services.notifications import notify_order_created, send_notification

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
    version="5.3",
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
app.add_middleware(RateLimitMiddleware)
app.add_middleware(BackendAuthMiddleware)
app.add_middleware(RequestIdMiddleware)
register_exception_handlers(app)


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
    modules = erp.health_modules()
    return {
        "status": "active",
        "message": "FAOS v5.3 Backend serving on Render cluster",
        "system": "FAOS v5.3 TAC Central Framework",
        "engine": "Aigorithm System Core Active",
        "health_check": "100% Functional",
        "gateway": "Zero-Trust API Routing Secure",
        "api_prefix": "/api/v5",
        "docs_url": "/docs",
        "openapi_url": "/openapi.json",
        "create_pillar_namespace": "fmk_create_pillar_retail_core",
        "bulletseye_namespace": "fmk_bulletseye_core_namespace",
        "ai_seo_module": "ENABLED",
        "bulletseye_squad": "ENABLED",
        "b2b_wig_ecosystem": "ENABLED",
        "harness_workers": "ENABLED",
        "jarvis_brain_nodes": ["fmk_wig_internal_engine", "rr_wigs_client_workspace"],
        "fmk_wig_namespace": FMK_WIG_NAMESPACE,
        "openrouter_configured": bool(os.getenv("OPENROUTER_API_KEY")),
        "modules": modules.get("modules"),
        "tac": modules.get("tac"),
    }


@app.get("/health")
async def health() -> Dict[str, Any]:
    return await root_health()


@app.get("/api/v5/health")
async def api_v5_health() -> Dict[str, Any]:
    """Versioned health with full ERP + TAC module broadcast."""
    base = await root_health()
    return {
        "ok": True,
        **base,
        "version": "5.3.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/v5/agent-trigger")
async def agent_trigger_status() -> Dict[str, Any]:
    return {
        "ok": True,
        "endpoint": "/api/v5/agent-trigger",
        "status": "ready",
        "message": "FAOS agent trigger channel online",
    }


@app.post("/api/v5/attachments")
async def ingest_attachments(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Validate multimodal attachment metadata for Aigorithm pipeline (no disk persist)."""
    raw = payload.get("attachments") or []
    if not isinstance(raw, list) or not raw:
        raise HTTPException(status_code=400, detail="Provide attachments[].")
    if len(raw) > 4:
        raise HTTPException(status_code=400, detail="Max 4 attachments.")

    max_bytes = 2 * 1024 * 1024
    sanitized: List[Dict[str, Any]] = []
    for item in raw[:4]:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "file")[:180]
        size = int(item.get("size") or 0)
        remote = item.get("remote_url")
        if isinstance(remote, str) and remote.startswith(("http://", "https://")):
            remote_url = remote[:2000]
        else:
            remote_url = None
        if size > max_bytes and not remote_url:
            raise HTTPException(status_code=400, detail=f"{name} exceeds size limit.")
        base64 = item.get("base64") if isinstance(item.get("base64"), str) else None
        if base64 and len(base64) > 1_800_000:
            raise HTTPException(status_code=400, detail=f"{name} base64 too large.")
        sanitized.append(
            {
                "id": str(item.get("id") or f"att_{len(sanitized)+1}"),
                "name": name,
                "kind": str(item.get("kind") or "file")[:40],
                "mime": str(item.get("mime") or "application/octet-stream")[:120],
                "size": size,
                "remote_url": remote_url,
                "has_base64": bool(base64),
                "truncated": bool(item.get("truncated")),
            }
        )

    return {
        "ok": True,
        "pipeline": "aigorithm_multimodal",
        "count": len(sanitized),
        "attachments": sanitized,
        "openrouter_configured": bool(os.getenv("OPENROUTER_API_KEY")),
        "note": "Secrets stay in Render env — attachment metadata only.",
    }


@app.get("/api/v5/attachments")
async def attachments_status() -> Dict[str, Any]:
    return {
        "ok": True,
        "endpoint": "/api/v5/attachments",
        "max_files": 4,
        "max_bytes": 2 * 1024 * 1024,
        "accepted": ["image/*", "application/pdf", "audio/*", "https video links"],
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


# --- BulletsEye AI SEO / GEO (Query Fan-Out) ---


@app.get("/api/v5/ai-seo")
async def ai_seo_status() -> Dict[str, Any]:
    return {**ai_seo_engine.module_status(), "source": "render"}


@app.post("/api/v5/ai-seo")
async def ai_seo_action(payload: Dict[str, Any]) -> Dict[str, Any]:
    action = payload.get("action") or "fan-out"
    if action == "status":
        return {"ok": True, "action": action, "source": "render", **ai_seo_engine.module_status()}
    if action in {"fan-out", "process"}:
        result = ai_seo_engine.generate_fan_out(payload)
        return {"action": action, "source": "render", **result}
    raise HTTPException(
        status_code=400,
        detail="Unknown action. Use action=fan-out|status.",
    )


# --- BulletsEye Autonomous SEO/GEO Squad ---


@app.get("/api/v5/bulletseye/seo-geo-execute")
async def bulletseye_squad_status() -> Dict[str, Any]:
    return {**bulletseye_squad.squad_status(), "source": "render"}


@app.post("/api/v5/bulletseye/seo-geo-execute")
async def bulletseye_squad_execute(payload: Dict[str, Any]) -> Dict[str, Any]:
    if not payload.get("brand_name") and not payload.get("brand_id"):
        raise HTTPException(status_code=400, detail="Provide brand_name or brand_id.")
    try:
        return bulletseye_squad.execute(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# --- Jarvis Brain Memory + B2B Wig Ecosystem + Harness Workers ---


@app.get("/api/v5/brain")
async def brain_status() -> Dict[str, Any]:
    return brain.status()


@app.get("/api/v5/brain/{node_id}")
async def brain_node(node_id: str) -> Dict[str, Any]:
    try:
        return brain.get_node(node_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/v5/apps/fmk-wig")
async def fmk_wig_app_get(resource: str = Query(default="summary")) -> Dict[str, Any]:
    return {**b2b_wig.fmk_get(resource), "source": "render"}


@app.post("/api/v5/apps/fmk-wig")
async def fmk_wig_app_post(payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        return {**b2b_wig.fmk_add_lead(payload), "source": "render"}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/v5/apps/rr-wigs")
async def rr_wigs_app_get(resource: str = Query(default="summary")) -> Dict[str, Any]:
    return {**b2b_wig.rr_get(resource), "source": "render"}


@app.post("/api/v5/apps/rr-wigs/inquiry")
async def rr_wigs_inquiry(payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        return {**b2b_wig.rr_add_inquiry(payload), "source": "render"}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/v5/harness")
async def harness_status() -> Dict[str, Any]:
    return harness.status()


@app.post("/api/v5/harness/cycle")
async def harness_cycle(payload: Dict[str, Any] | None = None) -> Dict[str, Any]:
    workers = (payload or {}).get("workers")
    if payload and payload.get("action") == "sync-inventory":
        return {**b2b_wig.sync_inventory(), "worker": "harness_gamma_inventory_sync", "source": "render"}
    return harness.run_cycle(workers)


# --- CRM / Projects / Agent Workflow (Odoo-style business suite) ---


@app.get("/api/v5/clients")
async def list_clients() -> Dict[str, Any]:
    return {"ok": True, "clients": workflow.list_clients()}


@app.post("/api/v5/clients")
async def create_client(payload: ClientCreate) -> Dict[str, Any]:
    record = workflow.create_client(payload.model_dump())
    return {"ok": True, "client": record}


@app.get("/api/v5/clients/{record_id}")
async def get_client(record_id: str) -> Dict[str, Any]:
    try:
        return {"ok": True, "client": workflow.get_client(record_id)}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.patch("/api/v5/clients/{record_id}")
async def update_client(record_id: str, payload: ClientUpdate) -> Dict[str, Any]:
    try:
        return {
            "ok": True,
            "client": workflow.update_client(
                record_id, payload.model_dump(exclude_unset=True)
            ),
        }
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.delete("/api/v5/clients/{record_id}")
async def delete_client(record_id: str) -> Dict[str, Any]:
    try:
        workflow.delete_client(record_id)
        return {"ok": True, "deleted": record_id}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/v5/projects")
async def list_projects(client_id: str | None = Query(default=None)) -> Dict[str, Any]:
    return {"ok": True, "projects": workflow.list_projects(client_id)}


@app.post("/api/v5/projects")
async def create_project(payload: ProjectCreate) -> Dict[str, Any]:
    record = workflow.create_project(payload.model_dump())
    return {"ok": True, "project": record}


@app.get("/api/v5/projects/{record_id}")
async def get_project(record_id: str) -> Dict[str, Any]:
    try:
        return {"ok": True, "project": workflow.get_project(record_id)}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.patch("/api/v5/projects/{record_id}")
async def update_project(record_id: str, payload: ProjectUpdate) -> Dict[str, Any]:
    try:
        return {
            "ok": True,
            "project": workflow.update_project(
                record_id, payload.model_dump(exclude_unset=True)
            ),
        }
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.delete("/api/v5/projects/{record_id}")
async def delete_project(record_id: str) -> Dict[str, Any]:
    try:
        workflow.delete_project(record_id)
        return {"ok": True, "deleted": record_id}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/v5/agent-workflow/tasks")
async def list_agent_tasks(project_id: str | None = Query(default=None)) -> Dict[str, Any]:
    return {"ok": True, "tasks": workflow.list_tasks(project_id)}


@app.post("/api/v5/agent-workflow/assign")
async def assign_agent_workflow(payload: AgentAssign) -> Dict[str, Any]:
    try:
        return workflow.assign_workflow(payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# --- ERP: Invoicing, Inventory, HR (Phase 3) ---


@app.get("/api/v5/invoices")
async def list_invoices() -> Dict[str, Any]:
    return {"ok": True, "invoices": erp.list_invoices()}


@app.post("/api/v5/invoices")
async def create_invoice(payload: InvoiceCreate) -> Dict[str, Any]:
    record = erp.create_invoice(payload.model_dump())
    return {"ok": True, "invoice": record}


@app.get("/api/v5/invoices/{record_id}")
async def get_invoice(record_id: str) -> Dict[str, Any]:
    try:
        return {"ok": True, "invoice": erp.get_invoice(record_id)}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.patch("/api/v5/invoices/{record_id}")
async def update_invoice(record_id: str, payload: InvoiceUpdate) -> Dict[str, Any]:
    try:
        record = erp.update_invoice(record_id, payload.model_dump(exclude_unset=True))
        return {"ok": True, "invoice": record}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.delete("/api/v5/invoices/{record_id}")
async def delete_invoice(record_id: str) -> Dict[str, Any]:
    try:
        erp.delete_invoice(record_id)
        return {"ok": True, "deleted": record_id}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/v5/inventory")
async def list_inventory() -> Dict[str, Any]:
    return {"ok": True, "inventory": erp.list_inventory()}


@app.post("/api/v5/inventory")
async def create_inventory_item(payload: InventoryCreate) -> Dict[str, Any]:
    record = erp.create_inventory(payload.model_dump())
    return {"ok": True, "item": record}


@app.get("/api/v5/inventory/{item_id}")
async def get_inventory_item(item_id: str) -> Dict[str, Any]:
    try:
        return {"ok": True, "item": erp.get_inventory(item_id)}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.patch("/api/v5/inventory/{item_id}")
async def adjust_inventory(item_id: str, payload: InventoryUpdate) -> Dict[str, Any]:
    data = payload.model_dump(exclude_unset=True)
    if "delta" in data and len(data) <= 2:
        try:
            item = erp.adjust_stock(item_id, int(data.get("delta") or 0))
            return {"ok": True, "item": item}
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
    try:
        return {"ok": True, "item": erp.update_inventory(item_id, data)}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.delete("/api/v5/inventory/{item_id}")
async def delete_inventory(item_id: str) -> Dict[str, Any]:
    try:
        erp.delete_inventory(item_id)
        return {"ok": True, "deleted": item_id}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/v5/employees")
async def list_employees() -> Dict[str, Any]:
    return {"ok": True, "employees": erp.list_employees()}


@app.post("/api/v5/employees")
async def create_employee(payload: EmployeeCreate) -> Dict[str, Any]:
    record = erp.create_employee(payload.model_dump())
    return {"ok": True, "employee": record}


@app.get("/api/v5/employees/{record_id}")
async def get_employee(record_id: str) -> Dict[str, Any]:
    try:
        return {"ok": True, "employee": erp.get_employee(record_id)}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.patch("/api/v5/employees/{record_id}")
async def update_employee(record_id: str, payload: EmployeeUpdate) -> Dict[str, Any]:
    try:
        return {
            "ok": True,
            "employee": erp.update_employee(
                record_id, payload.model_dump(exclude_unset=True)
            ),
        }
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.delete("/api/v5/employees/{record_id}")
async def delete_employee(record_id: str) -> Dict[str, Any]:
    try:
        erp.delete_employee(record_id)
        return {"ok": True, "deleted": record_id}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# --- Daily Work Logs (team + agent day tracking) ---


@app.get("/api/v5/work-logs")
async def list_work_logs(date: str | None = Query(default=None)) -> Dict[str, Any]:
    logs = erp.list_work_logs(date)
    return {
        "ok": True,
        "logs": logs,
        "stats": erp.work_log_stats(date),
    }


@app.post("/api/v5/work-logs")
async def create_work_log(payload: WorkLogCreate) -> Dict[str, Any]:
    record = erp.create_work_log(payload.model_dump())
    return {"ok": True, "work_log": record, "log": record}


@app.get("/api/v5/work-logs/{record_id}")
async def get_work_log(record_id: str) -> Dict[str, Any]:
    try:
        record = erp.get_work_log(record_id)
        return {"ok": True, "work_log": record, "log": record}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.patch("/api/v5/work-logs/{record_id}")
async def update_work_log(record_id: str, payload: WorkLogUpdate) -> Dict[str, Any]:
    try:
        record = erp.update_work_log(
            record_id, payload.model_dump(exclude_unset=True)
        )
        return {"ok": True, "work_log": record, "log": record}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.delete("/api/v5/work-logs/{record_id}")
async def delete_work_log(record_id: str) -> Dict[str, Any]:
    try:
        erp.delete_work_log(record_id)
        return {"ok": True, "deleted": record_id}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# --- Orders & Products (core CRUD) ---


@app.get("/api/v5/orders")
async def list_orders(status: str | None = Query(default=None)) -> Dict[str, Any]:
    return {"ok": True, "orders": erp.list_orders(status)}


@app.post("/api/v5/orders")
async def create_order(payload: OrderCreate) -> Dict[str, Any]:
    try:
        record = erp.create_order(payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    sync = record.pop("_sync", None)
    notify_to = os.getenv("FAOS_NOTIFY_DEFAULT_TO", "").strip()
    notification = None
    if notify_to:
        notification = notify_order_created(record, [e.strip() for e in notify_to.split(",") if e.strip()])
    return {
        "ok": True,
        "order": record,
        "sync": sync,
        "notification": notification,
    }


@app.get("/api/v5/orders/{record_id}")
async def get_order(record_id: str) -> Dict[str, Any]:
    try:
        return {"ok": True, "order": erp.get_order(record_id)}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.patch("/api/v5/orders/{record_id}")
async def update_order(record_id: str, payload: OrderUpdate) -> Dict[str, Any]:
    try:
        record = erp.update_order(record_id, payload.model_dump(exclude_unset=True))
        sync = record.pop("_sync", None)
        return {"ok": True, "order": record, "sync": sync}
    except ValueError as exc:
        message = str(exc)
        status = 404 if "not found" in message.lower() else 400
        raise HTTPException(status_code=status, detail=message) from exc


@app.delete("/api/v5/orders/{record_id}")
async def delete_order(record_id: str) -> Dict[str, Any]:
    try:
        erp.delete_order(record_id)
        return {"ok": True, "deleted": record_id}
    except ValueError as exc:
        message = str(exc)
        status = 404 if "not found" in message.lower() else 400
        raise HTTPException(status_code=status, detail=message) from exc


@app.get("/api/v5/products")
async def list_products() -> Dict[str, Any]:
    return {"ok": True, "products": erp.list_products()}


@app.post("/api/v5/products")
async def create_product(payload: ProductCreate) -> Dict[str, Any]:
    record = erp.create_product(payload.model_dump())
    sync = record.pop("_sync", None)
    return {"ok": True, "product": record, "sync": sync}


@app.get("/api/v5/products/{record_id}")
async def get_product(record_id: str) -> Dict[str, Any]:
    try:
        return {"ok": True, "product": erp.get_product(record_id)}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.patch("/api/v5/products/{record_id}")
async def update_product(record_id: str, payload: ProductUpdate) -> Dict[str, Any]:
    try:
        record = erp.update_product(record_id, payload.model_dump(exclude_unset=True))
        sync = record.pop("_sync", None)
        return {"ok": True, "product": record, "sync": sync}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.delete("/api/v5/products/{record_id}")
async def delete_product(record_id: str) -> Dict[str, Any]:
    try:
        erp.delete_product(record_id)
        return {"ok": True, "deleted": record_id}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# --- Notifications ---


@app.post("/api/v5/notifications/send")
async def send_notify(payload: NotifyRequest) -> Dict[str, Any]:
    result = send_notification(
        to=[str(e) for e in payload.to],
        subject=payload.subject,
        body=payload.body,
        template=payload.template,
        meta=payload.meta,
    )
    return {"ok": True, "notification": result}


# --- TAC Central Brain (3 Pillars + Parent Company) ---


@app.get("/api/v5/tac/status")
async def tac_status() -> Dict[str, Any]:
    return tac.get_status()


@app.post("/api/v5/tac/sync")
async def tac_sync() -> Dict[str, Any]:
    return tac.sync_pillars()


@app.post("/api/v5/tac/dispatch")
async def tac_dispatch(payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        return tac.dispatch_command(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/v5/tac/commands")
async def tac_commands() -> Dict[str, Any]:
    return {"ok": True, "commands": tac.list_commands()}


@app.get("/api/v5/tac/intelligence")
async def tac_intelligence(limit: int = Query(default=50, ge=1, le=200)) -> Dict[str, Any]:
    return {"ok": True, "logs": tac.list_intelligence(limit)}


@app.post("/api/v5/tac/intelligence")
async def tac_intelligence_emit(payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        return tac.record_system_event(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
