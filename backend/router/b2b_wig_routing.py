"""FAOS v5.0 — B2B Wig ecosystem (FMK Wig internal + RR Wigs tenant)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict


def _data_dir() -> Path:
    here = Path(__file__).resolve()
    for base in (here.parents[1] / "data", here.parents[2] / "data"):
        if base.exists():
            return base
    return here.parents[1] / "data"


def _load(name: str) -> Dict[str, Any]:
    path = _data_dir() / name
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {}


def _save(name: str, data: Dict[str, Any]) -> None:
    path = _data_dir() / name
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


class B2bWigService:
    def fmk_summary(self) -> Dict[str, Any]:
        db = _load("fmk_wig_b2b_db.json")
        return {
            "brain_node": db.get("brain_node"),
            "leads_total": len(db.get("b2b_leads") or []),
            "orders_active": len(
                [o for o in (db.get("salon_orders") or []) if o.get("status") != "completed"]
            ),
            "buyers_total": len(db.get("global_buyers") or []),
            "export_skus": len(db.get("export_catalog") or []),
            "import_skus": len(db.get("import_catalog") or []),
        }

    def fmk_get(self, resource: str) -> Dict[str, Any]:
        db = _load("fmk_wig_b2b_db.json")
        if resource == "leads":
            return {"ok": True, "leads": db.get("b2b_leads", [])}
        if resource == "orders":
            return {"ok": True, "orders": db.get("salon_orders", [])}
        if resource == "catalog":
            return {
                "ok": True,
                "export_catalog": db.get("export_catalog", []),
                "import_catalog": db.get("import_catalog", []),
            }
        if resource == "buyers":
            return {"ok": True, "buyers": db.get("global_buyers", [])}
        return {"ok": True, "brain_node": "fmk_wig_internal_engine", "summary": self.fmk_summary()}

    def fmk_add_lead(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not payload.get("company") or not payload.get("email"):
            raise ValueError("company and email required")
        db = _load("fmk_wig_b2b_db.json")
        now = datetime.now(timezone.utc).isoformat()
        lead = {
            "id": f"lead_fmk_{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            "company": payload["company"],
            "contact_name": payload.get("contact_name", ""),
            "email": payload["email"],
            "phone": payload.get("phone", ""),
            "country": payload.get("country", ""),
            "lead_source": payload.get("lead_source", "api"),
            "pipeline_stage": "new",
            "estimated_value_usd": payload.get("estimated_value_usd", 0),
            "assigned_agent": "fmk_wig_prosthetic_hair_agent",
            "created_at": now,
            "updated_at": now,
        }
        db.setdefault("b2b_leads", [])
        db["b2b_leads"] = [lead] + db["b2b_leads"]
        _save("fmk_wig_b2b_db.json", db)
        return {"ok": True, "lead": lead}

    def rr_summary(self) -> Dict[str, Any]:
        db = _load("rr_wigs_workspace_db.json")
        ad_spend = sum(a.get("spend_usd", 0) for a in (db.get("ad_spend") or []))
        return {
            "brain_node": db.get("brain_node"),
            "tenant_id": db.get("tenant_id"),
            "client_id": db.get("client_id"),
            "sessions_mtd": (db.get("web_analytics") or [{}])[0].get("sessions", 0),
            "ad_spend_mtd": ad_spend,
            "linkedin_leads": len(db.get("linkedin_leads") or []),
            "seo_keywords": len(db.get("seo_rankings") or []),
            "factory_skus": len(db.get("factory_inventory") or []),
            "open_inquiries": len(
                [i for i in (db.get("b2b_inquiries") or []) if i.get("status") == "new"]
            ),
        }

    def rr_get(self, resource: str) -> Dict[str, Any]:
        db = _load("rr_wigs_workspace_db.json")
        if resource == "analytics":
            return {
                "ok": True,
                "web_analytics": db.get("web_analytics", []),
                "ad_spend": db.get("ad_spend", []),
            }
        if resource == "linkedin":
            return {"ok": True, "leads": db.get("linkedin_leads", [])}
        if resource == "seo":
            return {"ok": True, "rankings": db.get("seo_rankings", [])}
        if resource == "inventory":
            return {"ok": True, "factory_inventory": db.get("factory_inventory", [])}
        if resource == "inquiries":
            return {"ok": True, "inquiries": db.get("b2b_inquiries", [])}
        return {
            "ok": True,
            "brain_node": "rr_wigs_client_workspace",
            "tenant_id": db.get("tenant_id"),
            "summary": self.rr_summary(),
        }

    def rr_add_inquiry(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not payload.get("company") or not payload.get("contact_email"):
            raise ValueError("company and contact_email required")
        db = _load("rr_wigs_workspace_db.json")
        now = datetime.now(timezone.utc).isoformat()
        inquiry = {
            "id": f"inq_rr_{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            "company": payload["company"],
            "contact_email": payload["contact_email"],
            "message": payload.get("message", ""),
            "source": payload.get("source", "website_form"),
            "status": "new",
            "created_at": now,
        }
        db.setdefault("b2b_inquiries", [])
        db["b2b_inquiries"] = [inquiry] + db["b2b_inquiries"]
        _save("rr_wigs_workspace_db.json", db)
        return {"ok": True, "inquiry": inquiry}

    def sync_inventory(self) -> Dict[str, Any]:
        rr = _load("rr_wigs_workspace_db.json")
        fmk = _load("fmk_wig_b2b_db.json")
        now = datetime.now(timezone.utc).isoformat()
        updates = []
        for item in rr.get("factory_inventory") or []:
            mapped = item.get("sku", "").replace("RR-", "FMK-RR-")
            existing = next(
                (c for c in (fmk.get("export_catalog") or []) if c.get("sku") == mapped),
                None,
            )
            if existing:
                existing["stock_units"] = item.get("units_on_hand", 0)
            else:
                entry = {
                    "sku": mapped,
                    "name": f"{item.get('product_name')} (RR Partner)",
                    "category": "prosthetic_hair",
                    "moq": 10,
                    "unit_price_usd": 95,
                    "stock_units": item.get("units_on_hand", 0),
                    "origin": "Bangladesh (RR Factory)",
                }
                fmk.setdefault("export_catalog", []).append(entry)
                updates.append(entry)
            item["synced_to_fmk"] = True
            item["last_sync_at"] = now
        _save("fmk_wig_b2b_db.json", fmk)
        _save("rr_wigs_workspace_db.json", rr)
        return {
            "ok": True,
            "synced": len(rr.get("factory_inventory") or []),
            "catalog_updates": len(updates),
        }


b2b_wig = B2bWigService()
