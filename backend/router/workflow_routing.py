"""FAOS v5.0 — CRM / Projects / Agent workflow store (Render persistence)."""

from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "faos_workflow_db.json"

CREATIVE_TERMS = ("design", "graphic", "logo", "banner", "creative", "visual", "figma", "canva")
VIDEO_TERMS = ("video", "edit", "reel", "youtube", "tiktok", "capcut", "storyboard", "subtitle")
BRAND_AGENTS = (
    (r"wig|hair|prosthetic", "fmk_wig_prosthetic_hair_agent"),
    (r"shoe|footwear|sneaker", "fmk_shoes_footwear_wing"),
    (r"kitchen|food|recipe", "fmk_mk_kitchen_cloud_food_agent"),
    (r"cloth|apparel|fashion", "fmk_mk_clothing_lifestyle_agent"),
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def _detect_task_type(command: str) -> str:
    lower = command.lower()
    if any(t in lower for t in VIDEO_TERMS):
        return "video"
    if any(t in lower for t in CREATIVE_TERMS):
        return "creative"
    return "general"


def _suggest_agent(command: str) -> str:
    lower = command.lower()
    for pattern, agent_id in BRAND_AGENTS:
        if re.search(pattern, lower):
            return agent_id
    return "fmk_wig_prosthetic_hair_agent"


def _load() -> Dict[str, Any]:
    if not DATA_PATH.exists():
        return {"clients": [], "projects": [], "tasks": []}
    with DATA_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def _save(data: Dict[str, Any]) -> None:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DATA_PATH.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


class WorkflowOrchestrator:
    def list_clients(self) -> List[Dict[str, Any]]:
        return sorted(_load()["clients"], key=lambda c: c.get("updated_at", ""), reverse=True)

    def create_client(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = _load()
        ts = _now()
        record = {
            "id": _uid("client"),
            "name": (payload.get("name") or "Unnamed Client").strip(),
            "industry": payload.get("industry"),
            "contact_email": payload.get("contact_email"),
            "notes": payload.get("notes"),
            "assigned_agent": payload.get("assigned_agent") or "fmk_wig_prosthetic_hair_agent",
            "created_at": ts,
            "updated_at": ts,
        }
        data["clients"].append(record)
        _save(data)
        return record

    def list_projects(self, client_id: Optional[str] = None) -> List[Dict[str, Any]]:
        projects = _load()["projects"]
        if client_id:
            projects = [p for p in projects if p.get("client_id") == client_id]
        return sorted(projects, key=lambda p: p.get("updated_at", ""), reverse=True)

    def create_project(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = _load()
        ts = _now()
        record = {
            "id": _uid("project"),
            "client_id": payload.get("client_id") or "",
            "name": (payload.get("name") or "New Project").strip(),
            "status": payload.get("status") or "active",
            "priority": payload.get("priority") or "normal",
            "command_brief": (payload.get("command_brief") or "").strip(),
            "assigned_agents": payload.get("assigned_agents")
            or ["fmk_wig_prosthetic_hair_agent"],
            "created_at": ts,
            "updated_at": ts,
        }
        data["projects"].append(record)
        _save(data)
        return record

    def list_tasks(self, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
        tasks = _load()["tasks"]
        if project_id:
            tasks = [t for t in tasks if t.get("project_id") == project_id]
        return sorted(tasks, key=lambda t: t.get("updated_at", ""), reverse=True)

    def assign_workflow(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = _load()
        ts = _now()
        command = (payload.get("command") or "").strip()
        if not command:
            raise ValueError("command is required")

        client_id = payload.get("client_id")
        if not client_id:
            client = self.create_client({"name": "Auto Client"})
            client_id = client["id"]
            data = _load()

        project_id = payload.get("project_id")
        project: Optional[Dict[str, Any]] = None
        if project_id:
            for p in data["projects"]:
                if p["id"] == project_id:
                    p["command_brief"] = command
                    p["updated_at"] = ts
                    project = p
                    break

        if not project:
            project = {
                "id": _uid("project"),
                "client_id": client_id,
                "name": payload.get("name") or f"Assignment {ts[:10]}",
                "status": "active",
                "priority": payload.get("priority") or "normal",
                "command_brief": command,
                "assigned_agents": payload.get("agent_ids")
                or ["fmk_wig_prosthetic_hair_agent"],
                "created_at": ts,
                "updated_at": ts,
            }
            data["projects"].append(project)

        agent_ids = payload.get("agent_ids") or [_suggest_agent(command)]
        task_type = payload.get("task_type") or _detect_task_type(command)
        created_tasks = []
        for agent_id in agent_ids:
            task = {
                "id": _uid("task"),
                "project_id": project["id"],
                "client_id": client_id,
                "agent_id": agent_id,
                "command": command,
                "status": "queued",
                "token_saving_mode": True,
                "task_type": task_type,
                "created_at": ts,
                "updated_at": ts,
            }
            data["tasks"].append(task)
            created_tasks.append(task)

        _save(data)
        return {
            "ok": True,
            "project": project,
            "tasks": created_tasks,
            "token_saving_mode": True,
            "message": "Workflow assigned — agents queued in token-saving mode (no auto-loops).",
        }


workflow = WorkflowOrchestrator()
