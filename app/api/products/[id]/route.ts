import { withApiRoute } from "@/lib/api-handler";
import { ApiError } from "@/lib/api-errors";
import {
  handleCrudDelete,
  handleCrudGet,
  handleCrudUpdate,
} from "@/lib/crud-route";
import {
  deleteProductLocal,
  getProductLocal,
  updateProductLocal,
} from "@/lib/erp-store";

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
  return handleCrudUpdate(id, request, config);
});

export const DELETE = withApiRoute(async (_req, ctx) => {
  const id = ctx.params?.id;
  if (!id) throw ApiError.badRequest("Product id is required.");
  return handleCrudDelete(id, config);
});
