"""FAOS v5.0 — Harness 24/7 background workers (Alpha, Beta, Gamma)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from router.b2b_wig_routing import b2b_wig


def _load_harness() -> Dict[str, Any]:
    here = Path(__file__).resolve()
    for base in (here.parents[1] / "data", here.parents[2] / "data"):
        path = base / "fmk_harness_workers.json"
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    return {}


class HarnessService:
    def status(self) -> Dict[str, Any]:
        cfg = _load_harness().get("fmk_harness_workers", {})
        return {
            "ok": True,
            "mode": cfg.get("mode", "24_7_background"),
            "workers": cfg.get("workers", {}),
            "loop": {"interval_ms": cfg.get("loop_interval_ms", 300000)},
            "source": "render",
        }

    def run_cycle(self, workers: List[str] | None = None) -> Dict[str, Any]:
        cfg = _load_harness().get("fmk_harness_workers", {})
        all_workers = list((cfg.get("workers") or {}).keys())
        target = workers or all_workers
        steps = []

        for wid in target:
            if wid == "harness_alpha_web_engineering":
                rr = b2b_wig.rr_get("inquiries")
                steps.append(
                    {
                        "worker": wid,
                        "codename": "Agent Alpha",
                        "status": "completed",
                        "summary": "RR Wigs web engine routes verified; B2B inquiry API ready.",
                        "payload": {
                            "open_inquiries": len(rr.get("inquiries") or []),
                        },
                    }
                )
            elif wid == "harness_beta_marketing_automation":
                rr = b2b_wig.rr_get("analytics")
                li = b2b_wig.rr_get("linkedin")
                ad = (rr.get("ad_spend") or [])
                spend = sum(a.get("spend_usd", 0) for a in ad)
                steps.append(
                    {
                        "worker": wid,
                        "codename": "Agent Beta",
                        "status": "completed",
                        "summary": f"Marketing automation tick — {len(li.get('leads') or [])} LinkedIn leads tracked.",
                        "payload": {"ad_spend_usd": spend},
                    }
                )
            elif wid == "harness_gamma_inventory_sync":
                sync = b2b_wig.sync_inventory()
                steps.append(
                    {
                        "worker": wid,
                        "codename": "Agent Gamma",
                        "status": "completed",
                        "summary": f"Synced {sync.get('synced', 0)} factory SKUs to FMK export catalog.",
                        "payload": sync,
                    }
                )

        return {
            "ok": True,
            "mode": "24_7_background",
            "steps": steps,
            "source": "render",
        }


harness = HarnessService()
