import { withApiRoute } from "@/lib/api-handler";
import { ApiError } from "@/lib/api-errors";
import { handleCrudDelete, handleCrudGet } from "@/lib/crud-route";
import { jsonOk } from "@/lib/api-response";
import { fetchWorkflow } from "@/lib/workflow-api";
import {
  deleteOrderLocal,
  getOrderLocal,
  updateOrderLocal,
  type OrderWithSync,
} from "@/lib/erp-store";
import { parseJsonWithSchema } from "@/lib/validation/parse";
import { orderUpdateSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const config = {
  upstreamPath: "orders",
  listKey: "orders",
  itemKey: "order",
  listLocal: () => [],
  createLocal: () => ({}),
  getLocal: getOrderLocal,
  updateLocal: updateOrderLocal,
  deleteLocal: deleteOrderLocal,
};

export const GET = withApiRoute(async (_req, ctx) => {
  const id = ctx.params?.id;
  if (!id) throw ApiError.badRequest("Order id is required.");
  return handleCrudGet(id, config);
});

export const PATCH = withApiRoute(async (request, ctx) => {
  const id = ctx.params?.id;
  if (!id) throw ApiError.badRequest("Order id is required.");

  const body = await parseJsonWithSchema(request, orderUpdateSchema);
  const { data, upstream, error } = await fetchWorkflow<{
    order: unknown;
    sync?: unknown;
  }>(`orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

  if (data?.order) {
    return jsonOk({ source: "render", order: data.order, sync: data.sync ?? null });
  }

  if (upstream && error) {
    const lower = error.toLowerCase();
    if (lower.includes("not found")) throw ApiError.notFound(error);
    throw ApiError.badRequest(error, "Order update rejected by upstream.");
  }

  let order: OrderWithSync | null;
  try {
    order = updateOrderLocal(id, body);
  } catch (err) {
    throw ApiError.badRequest(
      err instanceof Error ? err.message : "Order update failed cross-module sync."
    );
  }
  if (!order) throw ApiError.notFound("Order not found");

  const sync = order._sync ?? null;
  if (sync) delete order._sync;
  return jsonOk({ source: "vercel-local", order, sync });
});

export const DELETE = withApiRoute(async (_req, ctx) => {
  const id = ctx.params?.id;
  if (!id) throw ApiError.badRequest("Order id is required.");
  return handleCrudDelete(id, config);
});
