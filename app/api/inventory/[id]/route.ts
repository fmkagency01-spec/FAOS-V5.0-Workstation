import { withApiRoute } from "@/lib/api-handler";
import { ApiError } from "@/lib/api-errors";
import { handleCrudDelete, handleCrudGet } from "@/lib/crud-route";
import { jsonOk } from "@/lib/api-response";
import { fetchWorkflow } from "@/lib/workflow-api";
import {
  adjustStockLocal,
  deleteInventoryLocal,
  getInventoryLocal,
  updateInventoryLocal,
} from "@/lib/erp-store";
import { parseJsonWithSchema } from "@/lib/validation/parse";
import { inventoryUpdateSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const config = {
  upstreamPath: "inventory",
  listKey: "inventory",
  itemKey: "item",
  listLocal: () => [],
  createLocal: () => ({}),
  getLocal: getInventoryLocal,
  updateLocal: updateInventoryLocal,
  deleteLocal: deleteInventoryLocal,
};

export const GET = withApiRoute(async (_req, ctx) => {
  const id = ctx.params?.id;
  if (!id) throw ApiError.badRequest("Inventory id is required.");
  return handleCrudGet(id, config);
});

export const PATCH = withApiRoute(async (request, ctx) => {
  const id = ctx.params?.id;
  if (!id) throw ApiError.badRequest("Inventory id is required.");
  const body = await parseJsonWithSchema(request, inventoryUpdateSchema);

  if (body.delta != null && Object.keys(body).every((k) => k === "delta" || k === "id")) {
    const { data, upstream, error } = await fetchWorkflow<{ item: unknown }>(
      `inventory/${id}`,
      { method: "PATCH", body: JSON.stringify({ delta: body.delta }) }
    );
    if (data?.item) return jsonOk({ source: "render", item: data.item });
    if (upstream && error) throw ApiError.upstream(error);
    const item = adjustStockLocal(id, Number(body.delta));
    if (!item) throw ApiError.notFound("Inventory item not found");
    return jsonOk({ source: "vercel-local", item });
  }

  const { data, upstream, error } = await fetchWorkflow<{ item: unknown }>(
    `inventory/${id}`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
  if (data?.item) return jsonOk({ source: "render", item: data.item });
  if (upstream && error) throw ApiError.upstream(error);
  const item = updateInventoryLocal(id, body);
  if (!item) throw ApiError.notFound("Inventory item not found");
  return jsonOk({ source: "vercel-local", item });
});

export const DELETE = withApiRoute(async (_req, ctx) => {
  const id = ctx.params?.id;
  if (!id) throw ApiError.badRequest("Inventory id is required.");
  return handleCrudDelete(id, config);
});
