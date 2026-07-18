import { withApiRoute } from "@/lib/api-handler";
import { handleCrudList } from "@/lib/crud-route";
import { ApiError } from "@/lib/api-errors";
import { jsonOk } from "@/lib/api-response";
import { fetchWorkflow } from "@/lib/workflow-api";
import {
  createOrderLocal,
  deleteOrderLocal,
  getOrderLocal,
  listOrdersLocal,
  updateOrderLocal,
} from "@/lib/erp-store";
import { parseJsonWithSchema } from "@/lib/validation/parse";
import { orderCreateSchema } from "@/lib/validation/schemas";
import { sendNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const config = {
  upstreamPath: "orders",
  listKey: "orders",
  itemKey: "order",
  listLocal: listOrdersLocal,
  createLocal: createOrderLocal,
  getLocal: getOrderLocal,
  updateLocal: updateOrderLocal,
  deleteLocal: deleteOrderLocal,
};

export const GET = withApiRoute(async () => handleCrudList(config));

export const POST = withApiRoute(async (request) => {
  const body = await parseJsonWithSchema(request, orderCreateSchema);
  const { data, upstream, error } = await fetchWorkflow<{
    order: unknown;
    notification?: unknown;
  }>("orders", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (data?.order) {
    return jsonOk({ source: "render", order: data.order, notification: data.notification ?? null }, 201);
  }

  if (upstream && error) {
    throw ApiError.upstream(error, "Render backend rejected the order.");
  }

  const order = createOrderLocal(body);
  const notifyTo = process.env.FAOS_NOTIFY_DEFAULT_TO?.trim();
  let notification = null;
  if (notifyTo) {
    notification = await sendNotification({
      to: notifyTo.split(",").map((e) => e.trim()).filter(Boolean),
      subject: `FAOS Order ${order.order_number} created`,
      body: `Order ${order.order_number} for ${order.client_name} total ${order.currency} ${order.total}`,
      template: "order_created",
      meta: { order_id: order.id },
    });
  }

  return jsonOk({ source: "vercel-local", order, notification }, 201);
});
