import { withApiRoute } from "@/lib/api-handler";
import { ApiError } from "@/lib/api-errors";
import { handleCrudDelete, handleCrudGet } from "@/lib/crud-route";
import { jsonOk } from "@/lib/api-response";
import { fetchWorkflow } from "@/lib/workflow-api";
import {
  deleteProductLocal,
  getProductLocal,
  updateProductLocal,
  type ProductWithSync,
} from "@/lib/erp-store";
import { parseJsonWithSchema } from "@/lib/validation/parse";
import { productUpdateSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const config = {
  upstreamPath: "products",
  listKey: "products",
  itemKey: "product",
  listLocal: () => [],
  createLocal: () => ({}),
  getLocal: getProductLocal,
  updateLocal: updateProductLocal,
  deleteLocal: deleteProductLocal,
};

export const GET = withApiRoute(async (_req, ctx) => {
  const id = ctx.params?.id;
  if (!id) throw ApiError.badRequest("Product id is required.");
  return handleCrudGet(id, config);
});

export const PATCH = withApiRoute(async (request, ctx) => {
  const id = ctx.params?.id;
  if (!id) throw ApiError.badRequest("Product id is required.");
  const body = await parseJsonWithSchema(request, productUpdateSchema);
  const { data, upstream, error } = await fetchWorkflow<{
    product: unknown;
    sync?: unknown;
  }>(`products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (data?.product) {
    return jsonOk({
      source: "render",
      product: data.product,
      sync: data.sync ?? null,
    });
  }
  if (upstream && error) throw ApiError.upstream(error);
  const product: ProductWithSync | null = updateProductLocal(id, body);
  if (!product) throw ApiError.notFound("Product not found");
  const sync = product._sync ?? null;
  if (sync) delete product._sync;
  return jsonOk({ source: "vercel-local", product, sync });
});

export const DELETE = withApiRoute(async (_req, ctx) => {
  const id = ctx.params?.id;
  if (!id) throw ApiError.badRequest("Product id is required.");
  return handleCrudDelete(id, config);
});
