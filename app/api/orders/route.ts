import { withApiRoute } from "@/lib/api-handler";
import { handleCrudCreate, handleCrudList } from "@/lib/crud-route";
import {
  createOrderLocal,
  deleteOrderLocal,
  getOrderLocal,
  listOrdersLocal,
  updateOrderLocal,
} from "@/lib/erp-store";

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
export const POST = withApiRoute(async (request) => handleCrudCreate(request, config));
