"""FAOS V5.0 Autonomous Orchestration — JARVIS MATRIX background tick.

Runs harness workers, BulletsEye SEO/GEO fan-out scans, media pipeline drain,
TAC sync, and learning-hub pending ingestion without chat triggers.
"""

from __future__ import annotations

import json
import logging
import os
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from router.harness_routing import harness
from router.bulletseye_routing import squad as bulletseye_squad
from router.learning_hub_routing import learning_hub
from router.tac_routing import tac
from services.memory_namespaces import append_memory, load_group_core, memory_status

logger = logging.getLogger("FAOS_Orchestrate")

_STATE_LOCK = threading.RLock()
_RUNTIME: Dict[str, Any] = {
    "running": False,
    "last_tick_at": None,
    "last_tick_id": None,
    "ticks_completed": 0,
    "last_error": None,
    "last_result": None,
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _data_dir() -> Path:
    here = Path(__file__).resolve()
    for base in (here.parents[1] / "data", here.parents[2] / "data"):
        if base.exists() or base == (here.parents[1] / "data"):
            base.mkdir(parents=True, exist_ok=True)
            return base
    fallback = here.parents[1] / "data"
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback


def _state_path() -> Path:
    return _data_dir() / "faos_orchestrate_state.json"


def _media_queue_path() -> Path:
    path = _data_dir() / "media_pipeline" / "queue.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _load_json(path: Path, default: Dict[str, Any]) -> Dict[str, Any]:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return default


def _save_json(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def secrets_status() -> Dict[str, Any]:
    """Report which secrets are present — never expose values."""
    keys = [
        "OPENROUTER_API_KEY",
        "GEMINI_API_KEY",
        "DATABASE_URL",
        "FAOS_BACKEND_API_KEY",
        "FAOS_AUTH_SECRET",
        "BULLETSEYE_INJECT_WEBHOOK_KEY",
    ]
    return {
        k: ("configured" if os.getenv(k) else "missing") for k in keys
    }


def enqueue_media_job(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Create Pillar brands push raw assets → Editing Hub / Records queue."""
    queue = _load_json(_media_queue_path(), {"jobs": []})
    job = {
        "id": f"media_{uuid.uuid4().hex[:10]}",
        "source_brand": str(payload.get("source_brand") or "fmk")[:120],
        "asset_type": str(payload.get("asset_type") or "raw_media")[:80],
        "target_pipeline": str(
            payload.get("target_pipeline") or "fmk_editing_hub"
        )[:120],
        "title": str(payload.get("title") or "Untitled asset")[:300],
        "notes": str(payload.get("notes") or "")[:2000],
        "status": "queued",
        "created_at": _now(),
        "updated_at": _now(),
    }
    jobs = list(queue.get("jobs") or [])
    jobs.insert(0, job)
    queue["jobs"] = jobs[:200]
    _save_json(_media_queue_path(), queue)
    append_memory(
        "fmk_editing_hub",
        kind="media_enqueue",
        content=f"Queued {job['asset_type']}: {job['title']} from {job['source_brand']}",
        source="create_pillar_push",
        meta={"job_id": job["id"], "pipeline": job["target_pipeline"]},
    )
    return job


def _drain_media_pipeline(limit: int = 5) -> Dict[str, Any]:
    queue = _load_json(_media_queue_path(), {"jobs": []})
    jobs = list(queue.get("jobs") or [])
    processed: List[Dict[str, Any]] = []
    for job in jobs:
        if job.get("status") != "queued":
            continue
        if len(processed) >= limit:
            break
        target = str(job.get("target_pipeline") or "fmk_editing_hub")
        ns = "fmk_records" if "records" in target else "fmk_editing_hub"
        job["status"] = "processed"
        job["updated_at"] = _now()
        job["result"] = {
            "pipeline": target,
            "action": "auto_process",
            "message": "Asset staged for Editing Hub / Records pipeline",
        }
        append_memory(
            ns,
            kind="media_processed",
            content=(
                f"Auto-processed {job.get('title')} "
                f"({job.get('asset_type')}) via {target}"
            ),
            source="orchestrate_tick",
            meta={"job_id": job.get("id")},
        )
        # Cross-write to FMK Records when editing completes
        if ns == "fmk_editing_hub":
            append_memory(
                "fmk_records",
                kind="media_handoff",
                content=f"Handoff from Editing Hub: {job.get('title')}",
                source="fmk_editing_hub",
                meta={"job_id": job.get("id")},
            )
        processed.append(dict(job))
    queue["jobs"] = jobs
    _save_json(_media_queue_path(), queue)
    return {"ok": True, "processed": len(processed), "jobs": processed}


def _run_seo_geo_scans(use_llm: bool = False) -> Dict[str, Any]:
    core = load_group_core()
    targets = list(core.get("seo_geo_targets") or [])
    results: List[Dict[str, Any]] = []
    for target in targets:
        try:
            out = bulletseye_squad.execute(
                {
                    "brand_name": target.get("brand_name"),
                    "brand_id": target.get("brand_id"),
                    "query_type": target.get("query_type"),
                    "client_type": target.get("client_type", "internal_shell"),
                    "auto_inject_flag": False,
                    "use_llm": use_llm,
                }
            )
            ns = str(target.get("memory_ns") or "fmk_bulletseye_agency")
            append_memory(
                ns,
                kind="seo_geo_scan",
                content=(
                    f"BulletsEye fan-out for {target.get('brand_name')}: "
                    f"{target.get('query_type')}"
                ),
                source="orchestrate_tick",
                meta={
                    "execution_id": out.get("execution_id"),
                    "brand_id": target.get("brand_id"),
                },
            )
            results.append(
                {
                    "brand_id": target.get("brand_id"),
                    "status": "completed",
                    "execution_id": out.get("execution_id"),
                    "schema_blocks": len(out.get("schema_blocks") or []),
                }
            )
        except Exception as exc:  # noqa: BLE001 — tick must continue
            logger.warning("SEO/GEO scan failed for %s: %s", target.get("brand_id"), exc)
            results.append(
                {
                    "brand_id": target.get("brand_id"),
                    "status": "failed",
                    "error": str(exc)[:300],
                }
            )
    return {"ok": True, "scans": results, "count": len(results)}


class OrchestrateService:
    def status(self) -> Dict[str, Any]:
        disk = _load_json(_state_path(), {})
        with _STATE_LOCK:
            runtime = dict(_RUNTIME)
        core = load_group_core()
        media_q = _load_json(_media_queue_path(), {"jobs": []})
        queued = sum(
            1 for j in (media_q.get("jobs") or []) if j.get("status") == "queued"
        )
        return {
            "ok": True,
            "core_id": core.get("core_id", "fmk_group_ltd_core"),
            "engine": "JARVIS MATRIX V5.0",
            "system": "100% Autonomous",
            "autonomous_loop": {
                "enabled": os.getenv("FAOS_AUTONOMOUS_LOOP", "true").lower()
                in {"1", "true", "yes"},
                "interval_sec": int(
                    os.getenv(
                        "FAOS_ORCHESTRATE_INTERVAL_SEC",
                        str(
                            (core.get("autonomous_loop") or {}).get(
                                "default_interval_sec", 300
                            )
                        ),
                    )
                ),
            },
            "runtime": runtime,
            "persisted": {
                "last_tick_at": disk.get("last_tick_at"),
                "ticks_completed": disk.get("ticks_completed", 0),
                "last_tick_id": disk.get("last_tick_id"),
            },
            "media_queue_pending": queued,
            "secrets": secrets_status(),
            "memory": memory_status(),
            "source": "render",
        }

    def tick(
        self,
        *,
        jobs: Optional[List[str]] = None,
        use_llm: bool = False,
        workers: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        with _STATE_LOCK:
            if _RUNTIME["running"]:
                return {
                    "ok": True,
                    "skipped": True,
                    "reason": "tick_already_running",
                    "last_tick_id": _RUNTIME.get("last_tick_id"),
                }
            _RUNTIME["running"] = True

        tick_id = f"tick_{uuid.uuid4().hex[:12]}"
        started = _now()
        core = load_group_core()
        default_jobs = list(
            (core.get("autonomous_loop") or {}).get("jobs")
            or [
                "harness_cycle",
                "bulletseye_seo_geo_scan",
                "media_pipeline_drain",
                "tac_sync",
                "learning_hub_ingest_pending",
            ]
        )
        selected = jobs or default_jobs
        steps: List[Dict[str, Any]] = []

        try:
            if "harness_cycle" in selected:
                result = harness.run_cycle(workers)
                steps.append(
                    {
                        "job": "harness_cycle",
                        "status": "completed",
                        "summary": f"{len(result.get('steps') or [])} workers executed",
                        "payload": {"steps": result.get("steps")},
                    }
                )

            if "bulletseye_seo_geo_scan" in selected:
                seo = _run_seo_geo_scans(use_llm=use_llm)
                steps.append(
                    {
                        "job": "bulletseye_seo_geo_scan",
                        "status": "completed",
                        "summary": f"{seo.get('count', 0)} brand scans",
                        "payload": seo,
                    }
                )

            if "media_pipeline_drain" in selected:
                media = _drain_media_pipeline()
                steps.append(
                    {
                        "job": "media_pipeline_drain",
                        "status": "completed",
                        "summary": f"Processed {media.get('processed', 0)} media jobs",
                        "payload": media,
                    }
                )

            if "tac_sync" in selected:
                sync = tac.sync_pillars()
                steps.append(
                    {
                        "job": "tac_sync",
                        "status": "completed",
                        "summary": "TAC pillars synced",
                        "payload": {
                            "pillars": sync.get("pillars")
                            if isinstance(sync, dict)
                            else None,
                            "total_agents": sync.get("total_agents")
                            if isinstance(sync, dict)
                            else None,
                        },
                    }
                )

            if "learning_hub_ingest_pending" in selected:
                lh = learning_hub.ingest_pending(limit=10)
                steps.append(
                    {
                        "job": "learning_hub_ingest_pending",
                        "status": "completed",
                        "summary": f"Ingested {lh.get('processed', 0)} learning items",
                        "payload": lh,
                    }
                )

            finished = _now()
            result = {
                "ok": True,
                "tick_id": tick_id,
                "started_at": started,
                "finished_at": finished,
                "core_id": core.get("core_id", "fmk_group_ltd_core"),
                "engine": "JARVIS MATRIX V5.0",
                "system": "100% Autonomous",
                "jobs": selected,
                "steps": steps,
                "source": "render",
            }

            with _STATE_LOCK:
                _RUNTIME["last_tick_at"] = finished
                _RUNTIME["last_tick_id"] = tick_id
                _RUNTIME["ticks_completed"] = int(_RUNTIME.get("ticks_completed") or 0) + 1
                _RUNTIME["last_error"] = None
                _RUNTIME["last_result"] = {
                    "tick_id": tick_id,
                    "jobs": selected,
                    "step_count": len(steps),
                }
                ticks = _RUNTIME["ticks_completed"]

            _save_json(
                _state_path(),
                {
                    "last_tick_at": finished,
                    "last_tick_id": tick_id,
                    "ticks_completed": ticks,
                    "last_result": _RUNTIME["last_result"],
                },
            )
            append_memory(
                "fmk_aigorithm_ai_brain",
                kind="orchestrate_tick",
                content=f"Autonomous tick {tick_id} completed ({len(steps)} jobs)",
                source="orchestrate",
                meta={"tick_id": tick_id, "jobs": selected},
            )
            return result
        except Exception as exc:  # noqa: BLE001
            with _STATE_LOCK:
                _RUNTIME["last_error"] = str(exc)[:500]
            logger.exception("Orchestrate tick failed")
            raise
        finally:
            with _STATE_LOCK:
                _RUNTIME["running"] = False


orchestrate = OrchestrateService()
