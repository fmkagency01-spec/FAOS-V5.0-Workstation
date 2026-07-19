/**
 * TAC Intelligence event bus (Vercel local) — pipes ERP events into logs + AI insights.
 */

import { safeOpenRouterCall } from "@/lib/openrouter";
import { OpenRouterGuardError } from "@/lib/openrouter-guard";

export type TacInsight = {
  severity: "info" | "warning" | "anomaly";
  summary: string;
  actions: string[];
  source: "rule_engine" | "openrouter";
};

export type TacIntelligenceLog = {
  id: string;
  event_type: string;
  pillar_id: string;
  payload: Record<string, unknown>;
  insight: TacInsight;
  status: "logged";
  created_at: string;
};

const HIGH_VALUE_INVOICE = Number(
  process.env.FAOS_HIGH_VALUE_INVOICE_THRESHOLD || "1000"
);
const MAJOR_INVENTORY_DELTA = Number(
  process.env.FAOS_MAJOR_INVENTORY_DELTA || "25"
);
const MAX_LOGS = 200;

const intelligenceLogs: TacIntelligenceLog[] = [];

function now() {
  return new Date().toISOString();
}

function uid() {
  return `tac_intel_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ruleInsight(
  eventType: string,
  payload: Record<string, unknown>
): TacInsight {
  if (eventType === "order_finalized") {
    const total = Number(payload.total || 0);
    return {
      severity: total >= HIGH_VALUE_INVOICE ? "anomaly" : "info",
      summary: `Order ${payload.order_number} finalized — stock −${payload.quantity}, invoice linked, total ${payload.currency || "USD"} ${total.toFixed(2)}.`,
      actions: [
        "Verify warehouse pick completed",
        "Confirm invoice delivery to client",
      ],
      source: "rule_engine",
    };
  }
  if (eventType === "order_cancelled") {
    return {
      severity: "warning",
      summary: `Order ${payload.order_number} cancelled — stock restored and linked invoice marked cancelled.`,
      actions: ["Review cancellation reason", "Notify sales owner"],
      source: "rule_engine",
    };
  }
  if (eventType === "inventory_major_update") {
    const qty = Number(payload.quantity || 0);
    const reorder = Number(payload.reorder_level || 0);
    return {
      severity: qty <= reorder ? "anomaly" : "warning",
      summary: `Major inventory move on ${payload.sku}: delta ${Number(payload.delta || 0) >= 0 ? "+" : ""}${payload.delta}, on-hand ${qty} (reorder ${reorder}).`,
      actions: [
        qty <= reorder ? "Check reorder / PO pipeline" : "Audit stock movement",
      ],
      source: "rule_engine",
    };
  }
  if (eventType === "high_value_invoice") {
    return {
      severity: "anomaly",
      summary: `High-value invoice ${payload.invoice_number} (${payload.currency || "USD"} ${Number(payload.amount || 0).toFixed(2)}) for ${payload.client_name}.`,
      actions: ["Finance approval review", "Confirm payment terms"],
      source: "rule_engine",
    };
  }
  return {
    severity: "info",
    summary: String(payload.message || `TAC event recorded: ${eventType}`),
    actions: Array.isArray(payload.actions)
      ? (payload.actions as string[]).slice(0, 3)
      : [],
    source: "rule_engine",
  };
}

async function aiInsight(
  eventType: string,
  payload: Record<string, unknown>
): Promise<TacInsight | null> {
  if (!process.env.OPENROUTER_API_KEY?.trim()) return null;
  try {
    const result = await safeOpenRouterCall(
      [
        {
          role: "system",
          content:
            "Return only compact JSON with keys severity (info|warning|anomaly), summary, actions (max 3 strings).",
        },
        {
          role: "user",
          content: `FAOS TAC ERP event.\nevent_type=${eventType}\npayload=${JSON.stringify(payload)}`,
        },
      ],
      {
        maxTokens: 160,
        temperature: 0.2,
        clientKey: "tac-intelligence",
        intent: "analysis",
      }
    );
    let text = result.reply.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }
    const parsed = JSON.parse(text) as {
      severity?: TacInsight["severity"];
      summary?: string;
      actions?: string[];
    };
    return {
      severity: parsed.severity || "info",
      summary: parsed.summary || "AI insight generated.",
      actions: (parsed.actions || []).slice(0, 3),
      source: "openrouter",
    };
  } catch (err) {
    if (err instanceof OpenRouterGuardError) return null;
    return null;
  }
}

export async function emitIntelligenceEventLocal(
  eventType: string,
  payload: Record<string, unknown>,
  pillarId = "capital"
): Promise<TacIntelligenceLog> {
  const insight =
    (await aiInsight(eventType, payload)) || ruleInsight(eventType, payload);
  const record: TacIntelligenceLog = {
    id: uid(),
    event_type: eventType,
    pillar_id: pillarId,
    payload,
    insight,
    status: "logged",
    created_at: now(),
  };
  intelligenceLogs.push(record);
  if (intelligenceLogs.length > MAX_LOGS) {
    intelligenceLogs.splice(0, intelligenceLogs.length - MAX_LOGS);
  }
  return record;
}

export function listIntelligenceLogsLocal(limit = 50): TacIntelligenceLog[] {
  return [...intelligenceLogs]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, Math.max(1, Math.min(limit, 200)));
}

export function shouldEmitInventoryEvent(
  delta: number,
  quantity: number,
  reorderLevel: number
): boolean {
  return Math.abs(delta) >= MAJOR_INVENTORY_DELTA || quantity <= reorderLevel;
}

export function shouldEmitInvoiceEvent(amount: number): boolean {
  return amount >= HIGH_VALUE_INVOICE;
}

export async function emitOrderSyncEventsLocal(
  order: {
    id: string;
    order_number: string;
    client_name: string;
    product_name: string;
    quantity: number;
    total: number;
    currency: string;
    status: string;
    invoice_id?: string;
    inventory_id?: string;
  },
  effects: {
    stock_adjusted: boolean;
    invoice_mutated: boolean;
    inventory: { id: string; sku: string; name: string; quantity: number; reorder_level: number } | null;
    invoice: { id: string; invoice_number: string; amount: number; currency: string; client_name: string } | null;
    events: Array<{ type: string; delta?: number }>;
  },
  cancelled = false
): Promise<string[]> {
  const ids: string[] = [];
  if (!effects.stock_adjusted && !effects.invoice_mutated) return ids;

  const log = await emitIntelligenceEventLocal(
    cancelled ? "order_cancelled" : "order_finalized",
    {
      order_id: order.id,
      order_number: order.order_number,
      client_name: order.client_name,
      product_name: order.product_name,
      quantity: order.quantity,
      total: order.total,
      currency: order.currency,
      status: order.status,
      invoice_id: order.invoice_id,
      inventory_id: order.inventory_id,
    },
    cancelled ? "capital" : "create"
  );
  ids.push(log.id);

  if (effects.invoice && shouldEmitInvoiceEvent(effects.invoice.amount)) {
    const hv = await emitIntelligenceEventLocal(
      "high_value_invoice",
      {
        invoice_id: effects.invoice.id,
        invoice_number: effects.invoice.invoice_number,
        amount: effects.invoice.amount,
        currency: effects.invoice.currency,
        client_name: effects.invoice.client_name,
        order_id: order.id,
      },
      "capital"
    );
    ids.push(hv.id);
  }

  if (effects.inventory && effects.stock_adjusted) {
    const delta =
      effects.events.find((e) => e.type.startsWith("inventory"))?.delta || 0;
    if (
      shouldEmitInventoryEvent(
        delta,
        effects.inventory.quantity,
        effects.inventory.reorder_level
      )
    ) {
      const invLog = await emitIntelligenceEventLocal(
        "inventory_major_update",
        {
          inventory_id: effects.inventory.id,
          sku: effects.inventory.sku,
          name: effects.inventory.name,
          delta,
          quantity: effects.inventory.quantity,
          reorder_level: effects.inventory.reorder_level,
          order_id: order.id,
        },
        "create"
      );
      ids.push(invLog.id);
    }
  }

  return ids;
}

export function tacLocalHealth() {
  return {
    status: "operational" as const,
    intelligence_logs: intelligenceLogs.length,
    last_event: intelligenceLogs[intelligenceLogs.length - 1]?.created_at ?? null,
  };
}
