from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class ClientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    industry: Optional[str] = None
    contact_email: Optional[str] = None
    notes: Optional[str] = None
    assigned_agent: Optional[str] = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        value = v.strip()
        if not value:
            raise ValueError("name is required")
        return value


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    contact_email: Optional[str] = None
    notes: Optional[str] = None
    assigned_agent: Optional[str] = None


class ProjectCreate(BaseModel):
    client_id: str = ""
    name: str = Field(..., min_length=1, max_length=200)
    status: str = "active"
    priority: str = "normal"
    command_brief: str = ""
    assigned_agents: Optional[List[str]] = None


class ProjectUpdate(BaseModel):
    client_id: Optional[str] = None
    name: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    command_brief: Optional[str] = None
    assigned_agents: Optional[List[str]] = None


class AgentAssign(BaseModel):
    command: str = Field(..., min_length=1, max_length=4000)
    client_id: Optional[str] = None
    project_id: Optional[str] = None
    agent_ids: Optional[List[str]] = None
    priority: str = "normal"
    task_type: Optional[str] = None
    name: Optional[str] = None
    auto_execute: bool = False
