"""Shared OpenRouter client with multi-model rate-limit fallbacks.

All keys from os.getenv only — never hardcoded.
Ladder: primary → Gemini Pro → Claude 3.5 → GPT-4o → GPT-4o Mini.
"""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

logger = logging.getLogger("FAOS_OpenRouter")

OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

FALLBACK_CHAIN = [
    "google/gemini-2.5-pro-preview",
    "anthropic/claude-3.5-sonnet",
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
]


def get_openrouter_api_key() -> Optional[str]:
    key = os.getenv("OPENROUTER_API_KEY", "").strip()
    return key or None


def _build_chain(primary: str) -> List[str]:
    ordered = [primary, *FALLBACK_CHAIN]
    seen = set()
    out: List[str] = []
    for model in ordered:
        if model and model not in seen:
            seen.add(model)
            out.append(model)
    return out


def _is_retryable(status: Optional[int], body: str) -> bool:
    if status in {429, 402, 500, 502, 503, 504}:
        return True
    lower = (body or "").lower()
    return any(
        token in lower
        for token in (
            "rate limit",
            "no endpoints found",
            "model not found",
            "overloaded",
            "timeout",
            "quota",
            "temporarily",
        )
    )


def chat_completions(
    messages: List[Dict[str, str]],
    *,
    model: str = "openai/gpt-4o-mini",
    max_tokens: int = 400,
    temperature: float = 0.3,
    timeout: int = 45,
) -> Dict[str, Any]:
    """Call OpenRouter with graceful multi-model fallback on rate limits."""
    api_key = get_openrouter_api_key()
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not configured")

    site = os.getenv("NEXT_PUBLIC_SITE_URL", "https://faos-v5-0-workstation.vercel.app")
    last_error: Optional[Exception] = None

    for idx, candidate in enumerate(_build_chain(model)):
        payload = {
            "model": candidate,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        req = urllib.request.Request(
            OPENROUTER_ENDPOINT,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": site,
                "X-Title": "FAOS V5.0 Backend",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            if idx > 0:
                logger.warning("OpenRouter fallback succeeded with %s", candidate)
            return {
                "ok": True,
                "model": candidate,
                "reply": (
                    ((data.get("choices") or [{}])[0].get("message") or {}).get("content")
                    or ""
                ).strip(),
                "usage": data.get("usage"),
                "fallback_used": idx > 0,
            }
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")[:800]
            last_error = RuntimeError(f"OpenRouter HTTP {exc.code}: {body}")
            if not _is_retryable(exc.code, body) or idx == len(_build_chain(model)) - 1:
                raise last_error from exc
            logger.warning("OpenRouter retry next model after %s failed (%s)", candidate, exc.code)
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if idx == len(_build_chain(model)) - 1:
                raise
            logger.warning("OpenRouter retry next model after %s error: %s", candidate, exc)

    raise last_error or RuntimeError("OpenRouter call failed")
