import { withApiRoute } from "@/lib/api-handler";
import { ApiError } from "@/lib/api-errors";
import {
  handleCrudDelete,
  handleCrudGet,
  handleCrudUpdate,
} from "@/lib/crud-route";
import {
  deleteOrderLocal,
  getOrderLocal,
  updateOrderLocal,
} from "@/lib/erp-store";

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
  return handleCrudUpdate(id, request, config);
});

export const DELETE = withApiRoute(async (_req, ctx) => {
  const id = ctx.params?.id;
  if (!id) throw ApiError.badRequest("Order id is required.");
  return handleCrudDelete(id, config);
});
