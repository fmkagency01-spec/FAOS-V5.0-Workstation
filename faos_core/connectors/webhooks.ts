/**
 * FAOS v6.0 — External webhook / delivery connector
 */

export type WebhookPayload = {
  event: string;
  pipeline_id: string;
  brand?: string;
  body: Record<string, unknown>;
};

export type WebhookDeliveryResult = {
  ok: boolean;
  event: string;
  pipeline_id: string;
  delivered_at: string;
  mode: "dry_run" | "http";
  status_code?: number;
  error?: string;
};

/**
 * Deliver approval-gate output. Without WEBHOOK_URL, dry-runs safely.
 */
export async function deliverWebhook(
  payload: WebhookPayload,
  options?: { url?: string; dry_run?: boolean }
): Promise<WebhookDeliveryResult> {
  const url = options?.url || process.env.FAOS_WEBHOOK_URL?.trim();
  const dry = options?.dry_run ?? !url;

  if (dry || !url) {
    return {
      ok: true,
      event: payload.event,
      pipeline_id: payload.pipeline_id,
      delivered_at: new Date().toISOString(),
      mode: "dry_run",
    };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        source: "faos_v6",
        timestamp: new Date().toISOString(),
      }),
    });
    return {
      ok: res.ok,
      event: payload.event,
      pipeline_id: payload.pipeline_id,
      delivered_at: new Date().toISOString(),
      mode: "http",
      status_code: res.status,
      error: res.ok ? undefined : `http_${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      event: payload.event,
      pipeline_id: payload.pipeline_id,
      delivered_at: new Date().toISOString(),
      mode: "http",
      error: err instanceof Error ? err.message : "webhook_failed",
    };
  }
}
