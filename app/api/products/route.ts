import { withApiRoute } from "@/lib/api-handler";
import { handleCrudList } from "@/lib/crud-route";
import { ApiError } from "@/lib/api-errors";
import { jsonOk } from "@/lib/api-response";
import { fetchWorkflow } from "@/lib/workflow-api";
import {
  createProductLocal,
  deleteProductLocal,
  getProductLocal,
  listProductsLocal,
  updateProductLocal,
} from "@/lib/erp-store";
import { parseJsonWithSchema } from "@/lib/validation/parse";
import { productCreateSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const config = {
  upstreamPath: "products",
  listKey: "products",
  itemKey: "product",
  listLocal: listProductsLocal,
  createLocal: createProductLocal,
  getLocal: getProductLocal,
  updateLocal: updateProductLocal,
  deleteLocal: deleteProductLocal,
};

export const GET = withApiRoute(async () => handleCrudList(config));

export const POST = withApiRoute(async (request) => {
  const body = await parseJsonWithSchema(request, productCreateSchema);
  const { data, upstream, error } = await fetchWorkflow<{ product: unknown }>("products", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (data?.product) return jsonOk({ source: "render", product: data.product }, 201);
  if (upstream && error) throw ApiError.upstream(error);
  const product = createProductLocal(body);
  return jsonOk({ source: "vercel-local", product }, 201);
});
