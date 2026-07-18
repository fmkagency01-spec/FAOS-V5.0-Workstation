import { withApiRoute } from "@/lib/api-handler";
import {
  handleCrudCreate,
  handleCrudList,
} from "@/lib/crud-route";
import {
  createProductLocal,
  deleteProductLocal,
  getProductLocal,
  listProductsLocal,
  updateProductLocal,
} from "@/lib/erp-store";

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
export const POST = withApiRoute(async (request) => handleCrudCreate(request, config));
