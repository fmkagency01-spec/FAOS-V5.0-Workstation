"""
Transactional notification helpers.

Priority:
1. Resend HTTP API (RESEND_API_KEY)
2. SMTP (SMTP_HOST / SMTP_USER / SMTP_PASSWORD)
3. File log fallback (never crashes the request)
"""

from __future__ import annotations

import json
import logging
import os
import smtplib
import ssl
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib import error as urlerror
from urllib import request as urlrequest

logger = logging.getLogger("faos.notifications")

FALLBACK_DIR = Path(__file__).resolve().parents[1] / "data" / "notification_outbox"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _from_address() -> str:
    return (
        os.getenv("FAOS_NOTIFY_FROM", "").strip()
        or os.getenv("SMTP_FROM", "").strip()
        or "noreply@faos.local"
    )


def _write_fallback(payload: Dict[str, Any]) -> str:
    FALLBACK_DIR.mkdir(parents=True, exist_ok=True)
    path = FALLBACK_DIR / f"notify_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S_%f')}.json"
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    return str(path)


def _send_resend(to: List[str], subject: str, body: str) -> Optional[Dict[str, Any]]:
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    if not api_key:
        return None

    payload = json.dumps(
        {
            "from": _from_address(),
            "to": to,
            "subject": subject,
            "text": body,
        }
    ).encode("utf-8")

    req = urlrequest.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlrequest.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return {"provider": "resend", "ok": True, "id": data.get("id"), "response": data}
    except urlerror.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        logger.warning("Resend failed: %s %s", exc.code, detail)
        return {"provider": "resend", "ok": False, "error": detail or str(exc)}
    except Exception as exc:  # noqa: BLE001 — single-shot, fall through
        logger.warning("Resend unreachable: %s", exc)
        return {"provider": "resend", "ok": False, "error": str(exc)}


def _send_smtp(to: List[str], subject: str, body: str) -> Optional[Dict[str, Any]]:
    host = os.getenv("SMTP_HOST", "").strip()
    if not host:
        return None

    port = int(os.getenv("SMTP_PORT", "587") or "587")
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    use_tls = os.getenv("SMTP_TLS", "true").lower() in {"1", "true", "yes"}

    msg = EmailMessage()
    msg["From"] = _from_address()
    msg["To"] = ", ".join(to)
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        if use_tls:
            context = ssl.create_default_context()
            with smtplib.SMTP(host, port, timeout=20) as server:
                server.starttls(context=context)
                if user and password:
                    server.login(user, password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=20) as server:
                if user and password:
                    server.login(user, password)
                server.send_message(msg)
        return {"provider": "smtp", "ok": True, "host": host}
    except Exception as exc:  # noqa: BLE001
        logger.warning("SMTP failed: %s", exc)
        return {"provider": "smtp", "ok": False, "error": str(exc)}


def send_notification(
    *,
    to: List[str],
    subject: str,
    body: str,
    template: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Send a transactional notification. Never raises — always returns a result dict.
    External API failures fall back to the local outbox file.
    """
    envelope = {
        "to": to,
        "subject": subject,
        "body": body,
        "template": template,
        "meta": meta or {},
        "created_at": _now(),
    }

    resend_result = _send_resend(to, subject, body)
    if resend_result and resend_result.get("ok"):
        return {**envelope, "delivery": resend_result, "fallback": False}

    smtp_result = _send_smtp(to, subject, body)
    if smtp_result and smtp_result.get("ok"):
        return {**envelope, "delivery": smtp_result, "fallback": False}

    path = _write_fallback(
        {
            **envelope,
            "attempts": [r for r in (resend_result, smtp_result) if r],
        }
    )
    return {
        **envelope,
        "delivery": {
            "provider": "outbox_file",
            "ok": True,
            "path": path,
            "message": "External mail unavailable — queued to local outbox",
        },
        "fallback": True,
        "attempts": [r for r in (resend_result, smtp_result) if r],
    }


def notify_order_created(order: Dict[str, Any], recipients: List[str]) -> Dict[str, Any]:
    subject = f"FAOS Order {order.get('order_number')} created"
    body = (
        f"Order {order.get('order_number')} for {order.get('client_name')} "
        f"({order.get('quantity')} × {order.get('product_name') or 'item'}) "
        f"total {order.get('currency')} {order.get('total')} is now {order.get('status')}."
    )
    return send_notification(to=recipients, subject=subject, body=body, template="order_created", meta={"order_id": order.get("id")})


def notify_invoice_status(invoice: Dict[str, Any], recipients: List[str]) -> Dict[str, Any]:
    subject = f"FAOS Invoice {invoice.get('invoice_number')} → {invoice.get('status')}"
    body = (
        f"Invoice {invoice.get('invoice_number')} for {invoice.get('client_name')} "
        f"amount {invoice.get('currency')} {invoice.get('amount')} is now {invoice.get('status')}."
    )
    return send_notification(to=recipients, subject=subject, body=body, template="invoice_status", meta={"invoice_id": invoice.get("id")})
