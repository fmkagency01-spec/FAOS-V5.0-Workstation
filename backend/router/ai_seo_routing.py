"""
FAOS v5.0 — BulletsEye AI SEO & Query Fan-Out Module

Agency wing: fmk_bulletseye_core_namespace
Core strategy: Query Fan-Out Decomposition & Extractable Content Parser
Uses OpenRouter when OPENROUTER_API_KEY is set; otherwise deterministic GEO metadata.
"""

from __future__ import annotations

import json
import logging
import os
import re
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("FAOS_AI_SEO")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
BULLETSEYE_NAMESPACE = "fmk_bulletseye_core_namespace"
DEFAULT_MODEL = "openai/gpt-4o-mini"


def _load_namespace() -> Dict[str, Any]:
    here = Path(__file__).resolve()
    candidates = [
        here.parents[1] / "data" / "fmk_bulletseye_core_namespace.json",
        here.parents[2] / "data" / "fmk_bulletseye_core_namespace.json",
    ]
    for data_path in candidates:
        if data_path.exists():
            with data_path.open("r", encoding="utf-8") as handle:
                return json.load(handle)
    raise FileNotFoundError(
        "BulletsEye AI SEO namespace JSON not found in backend/data or repo data/"
    )


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:80]


def _is_question_like(text: str) -> bool:
    t = text.strip()
    return t.endswith("?") or bool(
        re.match(r"^(why|what|how|who|which|best|where)\b", t, flags=re.I)
    )


class AiSeoGeoEngine:
    def __init__(self) -> None:
        self.namespace = BULLETSEYE_NAMESPACE
        self.db = _load_namespace()
        self.ns = self.db[BULLETSEYE_NAMESPACE]

    def list_brands(self) -> List[Dict[str, Any]]:
        brands = self.ns.get("brands", {})
        out: List[Dict[str, Any]] = []
        for brand_id, meta in brands.items():
            out.append(
                {
                    "id": brand_id,
                    "brand_name": meta.get("brand_name"),
                    "channel": meta.get("channel"),
                    "pillar_topic": meta.get("pillar_topic"),
                    "primary_queries": meta.get("primary_queries", []),
                    "local_signals": meta.get("local_signals", []),
                    "sub_brands": meta.get("sub_brands"),
                }
            )
        return out

    def module_status(self) -> Dict[str, Any]:
        return {
            "ok": True,
            "agency_wing": self.ns.get("agency_wing"),
            "namespace": self.namespace,
            "module": self.ns.get("module"),
            "status": self.ns.get("status"),
            "core_strategy": self.ns.get("core_strategy"),
            "aigorithm_engine": self.ns.get("aigorithm_engine"),
            "target_platforms": self.ns.get("target_platforms", []),
            "fan_out_axes": self.ns.get("fan_out_axes", []),
            "content_framework": self.ns.get("content_framework", {}),
            "delivery_channels": self.ns.get("delivery_channels", {}),
            "brands": self.list_brands(),
            "openrouter_configured": bool(OPENROUTER_API_KEY),
        }

    def _resolve_brand(
        self, brand_id: Optional[str], brand_name: Optional[str]
    ) -> tuple[str, Dict[str, Any]]:
        brands: Dict[str, Dict[str, Any]] = self.ns.get("brands", {})
        if brand_id and brand_id in brands:
            return brand_id, brands[brand_id]

        if brand_name:
            needle = brand_name.strip().lower()
            for bid, meta in brands.items():
                if str(meta.get("brand_name", "")).lower() == needle:
                    return bid, meta

        default_id = "fmk_wig_prosthetic_hair_agent"
        return default_id, brands[default_id]

    def _deterministic_fan_out(
        self, brand_name: str, topic: str, local_signals: List[str]
    ) -> List[Dict[str, Any]]:
        locale = local_signals[0] if local_signals else "Bangladesh"
        axes = self.ns.get("fan_out_axes", [])
        topic_clean = topic.rstrip("?")
        if _is_question_like(topic):
            direct_h2 = f"{topic_clean}?"
            direct_query = f"{topic_clean}?"
        else:
            direct_h2 = f"Why choose {brand_name} for {topic}?"
            direct_query = f"What is the best {topic} from {brand_name}?"

        templates = {
            "direct_intent": {
                "query": direct_query,
                "cluster_slug": _slugify(f"{brand_name}-best-{topic}"),
                "recommended_h2": direct_h2,
                "direct_answer": (
                    f"{brand_name} delivers {topic_clean} with clear product specs, "
                    f"local fulfilment in {locale}, and extractable proof points AI engines can cite."
                ),
                "extractable_bullets": [
                    f"Core offer: {topic_clean}",
                    f"Brand: {brand_name}",
                    f"Primary market: {locale}",
                ],
            },
            "attribute_constraints": {
                "query": f"{brand_name} {topic} features materials specifications quality",
                "cluster_slug": _slugify(f"{brand_name}-features-specs"),
                "recommended_h2": f"Key features & constraints of {brand_name} {topic}",
                "direct_answer": (
                    f"{brand_name} focuses on measurable attributes so LLM retrieval "
                    "can lift structured chunks instead of vague marketing copy."
                ),
                "extractable_bullets": [
                    "Feature-level H2/H3 hierarchy",
                    "Spec tables preferred over long paragraphs",
                    "Constraint language for long-tail fan-out matches",
                ],
            },
            "comparative_latent": {
                "query": f"{brand_name} vs alternatives for {topic} in {locale}",
                "cluster_slug": _slugify(f"{brand_name}-vs-alternatives"),
                "recommended_h2": f"{brand_name} vs alternatives — who should buy?",
                "direct_answer": (
                    f"Buyers comparing options for {topic} in {locale} should weigh "
                    f"{brand_name}'s specialty positioning and local support."
                ),
                "extractable_bullets": [
                    "Comparison table ready",
                    "Latent need: reliability + local support",
                    "Decision criteria listed as bullets",
                ],
            },
            "trust_eeat": {
                "query": f"{brand_name} reviews ratings case studies {locale} trust signals",
                "cluster_slug": _slugify(f"{brand_name}-reviews-eeat"),
                "recommended_h2": f"{brand_name} reviews, local proof & E-E-A-T signals",
                "direct_answer": (
                    f"{brand_name} strengthens AI citation trust via reviews, "
                    f"third-party mentions, and real {locale} case studies."
                ),
                "extractable_bullets": [
                    *[f"Local signal: {s}" for s in local_signals[:3]],
                    "Third-party / UGC mention targets armed",
                ],
            },
        }

        result: List[Dict[str, Any]] = []
        for axis in axes:
            axis_id = axis.get("id", "direct_intent")
            payload = templates.get(axis_id, templates["direct_intent"])
            result.append(
                {
                    "axis": axis_id,
                    "label": axis.get("label"),
                    **payload,
                }
            )
        return result

    def _build_schema(
        self, brand_name: str, topic: str, fan_out: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        faq_entities = [
            {
                "@type": "Question",
                "name": q["recommended_h2"],
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": q["direct_answer"],
                },
            }
            for q in fan_out
        ]
        return [
            {
                "type": "Organization",
                "json_ld": {
                    "@context": "https://schema.org",
                    "@type": "Organization",
                    "name": brand_name,
                    "description": topic,
                    "areaServed": "BD",
                },
            },
            {
                "type": "FAQPage",
                "json_ld": {
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    "mainEntity": faq_entities,
                },
            },
            {
                "type": "Product",
                "json_ld": {
                    "@context": "https://schema.org",
                    "@type": "Product",
                    "name": f"{brand_name} — {topic}",
                    "brand": {"@type": "Brand", "name": brand_name},
                    "description": fan_out[0]["direct_answer"] if fan_out else topic,
                },
            },
        ]

    def _call_openrouter(self, brand_name: str, topic: str, base: List[Dict[str, Any]]) -> Optional[List[Dict[str, Any]]]:
        if not OPENROUTER_API_KEY:
            return None

        prompt = f"""You are FAOS BulletsEye AI SEO Engine (GEO).
Analyze brand '{brand_name}' and topic '{topic}'.
Return ONLY JSON with fan_out_queries (4 items: direct_intent, attribute_constraints, comparative_latent, trust_eeat)
each having axis, query, recommended_h2, direct_answer, extractable_bullets.
Seed: {json.dumps([{"axis": q["axis"], "query": q["query"]} for q in base])}"""

        body = json.dumps(
            {
                "model": DEFAULT_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert GEO & AI SEO Architect. Reply with JSON only.",
                    },
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 900,
                "temperature": 0.3,
            }
        ).encode("utf-8")

        req = urllib.request.Request(
            OPENROUTER_ENDPOINT,
            data=body,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": os.getenv(
                    "NEXT_PUBLIC_SITE_URL", "https://faos-v5-0-workstation.vercel.app"
                ),
                "X-Title": "FAOS BulletsEye AI SEO",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            reply = (
                payload.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
                .strip()
            )
            cleaned = re.sub(r"^```json\s*|^```\s*|```$", "", reply, flags=re.I).strip()
            parsed = json.loads(cleaned)
            rows = parsed.get("fan_out_queries") or []
            if len(rows) < 4:
                return None

            labels = {a["id"]: a.get("label") for a in self.ns.get("fan_out_axes", [])}
            enriched: List[Dict[str, Any]] = []
            for idx, row in enumerate(rows[:4]):
                fallback = base[idx]
                axis = row.get("axis") or fallback["axis"]
                query = (row.get("query") or fallback["query"]).strip()
                enriched.append(
                    {
                        "axis": axis,
                        "label": labels.get(axis, fallback.get("label")),
                        "query": query,
                        "cluster_slug": _slugify(query),
                        "recommended_h2": (
                            row.get("recommended_h2") or fallback["recommended_h2"]
                        ).strip(),
                        "direct_answer": (
                            row.get("direct_answer") or fallback["direct_answer"]
                        ).strip(),
                        "extractable_bullets": (
                            row.get("extractable_bullets")
                            or fallback["extractable_bullets"]
                        )[:6],
                    }
                )
            return enriched
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError, IndexError) as exc:
            logger.warning("OpenRouter fan-out enrichment failed: %s", exc)
            return None

    def generate_fan_out(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        brand_id, meta = self._resolve_brand(
            payload.get("brand_id") if isinstance(payload.get("brand_id"), str) else None,
            payload.get("brand_name")
            if isinstance(payload.get("brand_name"), str)
            else None,
        )
        brand_name = (
            payload.get("brand_name").strip()
            if isinstance(payload.get("brand_name"), str) and payload.get("brand_name").strip()
            else meta.get("brand_name", "FMK WIG")
        )
        topic = (
            payload.get("client_topic").strip()
            if isinstance(payload.get("client_topic"), str)
            and payload.get("client_topic").strip()
            else meta.get("pillar_topic", f"{brand_name} product information")
        )
        channel = payload.get("channel") or (
            "internal" if meta.get("channel") == "internal" else "external_b2b"
        )
        use_llm = payload.get("use_llm", True)

        deterministic = self._deterministic_fan_out(
            brand_name, topic, list(meta.get("local_signals") or [])
        )
        fan_out = deterministic
        source = "deterministic"
        if use_llm is not False:
            enriched = self._call_openrouter(brand_name, topic, deterministic)
            if enriched:
                fan_out = enriched
                source = "openrouter"

        return {
            "ok": True,
            "source": source,
            "namespace": self.namespace,
            "agency_wing": self.ns.get("agency_wing"),
            "module": self.ns.get("module"),
            "aigorithm_engine": self.ns.get("aigorithm_engine"),
            "brand_name": brand_name,
            "brand_id": brand_id,
            "client_topic": topic,
            "channel": channel,
            "fan_out_queries": fan_out,
            "recommended_h2_headers": [q["recommended_h2"] for q in fan_out],
            "pillar_page": {
                "title": f"{brand_name}: {topic}",
                "slug": _slugify(f"{brand_name}-{topic}-pillar"),
                "summary": (
                    f"Pillar page for {brand_name} covering {topic} with "
                    f"{len(fan_out)} fan-out cluster pages for AI citation coverage."
                ),
            },
            "cluster_plan": [
                {
                    "slug": q["cluster_slug"],
                    "title": q["recommended_h2"],
                    "axis": q["axis"],
                    "target_query": q["query"],
                }
                for q in fan_out
            ],
            "schema_blocks": self._build_schema(brand_name, topic, fan_out),
            "eeat_signals": [
                *list(meta.get("local_signals") or []),
                "Third-party platform mentions",
                "Real-time case study lift",
                "Review / rating extractables",
            ],
            "ugc_push_targets": list(self.ns.get("ugc_engines") or []),
            "delivery": {
                "internal": list(
                    self.ns.get("delivery_channels", {}).get(
                        "internal_shell_brands", []
                    )
                ),
                "external_b2b": list(
                    self.ns.get("delivery_channels", {}).get("external_b2b", [])
                ),
            },
            "openrouter_configured": bool(OPENROUTER_API_KEY),
        }


engine = AiSeoGeoEngine()


def generate_fan_out_queries(
    client_topic: str, brand_name: str, **kwargs: Any
) -> Dict[str, Any]:
    """Public helper matching the BulletsEye strategy signature."""
    return engine.generate_fan_out(
        {
            "client_topic": client_topic,
            "brand_name": brand_name,
            **kwargs,
        }
    )


if __name__ == "__main__":
    sample = generate_fan_out_queries(
        "Kadam leather shoes Bangladesh",
        "FMK Shoes",
        use_llm=False,
    )
    print(json.dumps(sample, indent=2))
