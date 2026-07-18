/**
 * Next.js notification helper — proxies to Render or falls back to local outbox log.
 * Secrets stay server-side (RESEND_API_KEY / SMTP_* via env).
 */

import { fetchWorkflow } from "@/lib/workflow-api";

export type NotifyPayload = {
  to: string[];
  subject: string;
  body: string;
  template?: string;
  meta?: Record<string, unknown>;
};

export type NotifyResult = {
  ok: boolean;
  fallback: boolean;
  provider?: string;
  message?: string;
  notification?: unknown;
};

async function localOutbox(payload: NotifyPayload): Promise<NotifyResult> {
  console.info("[faos-notify-outbox]", JSON.stringify(payload));
  return {
    ok: true,
    fallback: true,
    provider: "console_outbox",
    message: "Queued to server log — configure RESEND_API_KEY or SMTP on Render for delivery",
  };
}

export async function sendNotification(payload: NotifyPayload): Promise<NotifyResult> {
  const { data, error } = await fetchWorkflow<{ ok: boolean; notification: unknown }>(
    "notifications/send",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  if (data?.ok) {
    const delivery = (data.notification as { delivery?: { provider?: string }; fallback?: boolean })
      ?.delivery;
    return {
      ok: true,
      fallback: Boolean((data.notification as { fallback?: boolean })?.fallback),
      provider: delivery?.provider,
      notification: data.notification,
    };
  }

  if (error) {
    const fallback = await localOutbox(payload);
    return { ...fallback, message: `${error} — ${fallback.message}` };
  }

  return localOutbox(payload);
}
