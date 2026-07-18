import { NextRequest } from "next/server";
import { withApiRoute, parseJsonBodyOrClone } from "@/lib/api-handler";
import { jsonOk } from "@/lib/api-response";
import { fetchWorkflow } from "@/lib/workflow-api";
import { ApiError } from "@/lib/api-errors";
import {
  adjustStockLocal,
  createInventoryLocal,
  deleteInventoryLocal,
  getInventoryLocal,
  listInventoryLocal,
  updateInventoryLocal,
} from "@/lib/erp-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiRoute(async () => {
  const { data } = await fetchWorkflow<{ inventory: unknown[] }>("inventory");
  if (data?.inventory) return jsonOk({ source: "render", inventory: data.inventory });
  return jsonOk({ source: "vercel-local", inventory: listInventoryLocal() });
});

export const POST = withApiRoute(async (request: NextRequest) => {
  const { body, raw } = await parseJsonBodyOrClone(request);
  const { data, upstream, error } = await fetchWorkflow<{ item: unknown }>("inventory", {
    method: "POST",
    body: raw,
  });
  if (data?.item) return jsonOk({ source: "render", item: data.item }, 201);
  if (upstream && error) throw ApiError.upstream(error);
  const item = createInventoryLocal(body as Parameters<typeof createInventoryLocal>[0]);
  return jsonOk({ source: "vercel-local", item }, 201);
});

export const PATCH = withApiRoute(async (request: NextRequest) => {
  const { body } = await parseJsonBodyOrClone(request);
  const id = String(body.id || "");
  if (!id) throw ApiError.badRequest("Inventory id is required in body.id for stock adjust.");

  const delta = Number(body.delta ?? 0);
  const { data, upstream, error } = await fetchWorkflow<{ item: unknown }>(`inventory/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ delta }),
  });
  if (data?.item) return jsonOk({ source: "render", item: data.item });
  if (upstream && error) throw ApiError.upstream(error);

  const item = adjustStockLocal(id, delta);
  if (!item) throw ApiError.notFound("Inventory item not found.");
  return jsonOk({ source: "vercel-local", item });
});
