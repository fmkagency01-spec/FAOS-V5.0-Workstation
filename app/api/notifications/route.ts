import { withApiRoute } from "@/lib/api-handler";
import { jsonOk } from "@/lib/api-response";
import { parseJsonWithSchema } from "@/lib/validation/parse";
import { notifySchema } from "@/lib/validation/schemas";
import { sendNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApiRoute(async (request) => {
  const payload = await parseJsonWithSchema(request, notifySchema);
  const result = await sendNotification(payload);
  return jsonOk({ notification: result });
});

export const GET = withApiRoute(async () => {
  return jsonOk({
    endpoint: "/api/notifications",
    providers: ["resend", "smtp", "outbox_file"],
    hint: "Set RESEND_API_KEY or SMTP_* on Render; FAOS_NOTIFY_DEFAULT_TO for auto order emails.",
  });
});
