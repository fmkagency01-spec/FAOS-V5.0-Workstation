"""Global exception handlers — structured JSON, no silent failures."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("faos.backend")


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict):
        message = detail.get("error") or detail.get("message") or str(detail)
    else:
        message = str(detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "ok": False,
            "error": message,
            "code": "HTTP_ERROR",
            "path": request.url.path,
        },
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "ok": False,
            "error": "Request validation failed",
            "code": "VALIDATION",
            "details": exc.errors(),
            "path": request.url.path,
        },
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "ok": False,
            "error": "Internal server error",
            "code": "INTERNAL",
            "path": request.url.path,
        },
    )


def register_exception_handlers(app: Any) -> None:
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
