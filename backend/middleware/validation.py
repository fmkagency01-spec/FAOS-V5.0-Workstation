"""Shared validation helpers for ERP payloads."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import HTTPException


def require_str(payload: Dict[str, Any], field: str, default: str | None = None) -> str:
    raw = payload.get(field, default)
    if raw is None or not str(raw).strip():
        raise HTTPException(status_code=400, detail=f"{field} is required")
    return str(raw).strip()


def optional_float(payload: Dict[str, Any], field: str, default: float = 0.0) -> float:
    raw = payload.get(field, default)
    try:
        return float(raw)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail=f"{field} must be a number") from None


def optional_int(payload: Dict[str, Any], field: str, default: int = 0) -> int:
    raw = payload.get(field, default)
    try:
        return int(raw)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail=f"{field} must be an integer") from None
