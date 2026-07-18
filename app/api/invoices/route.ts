import { withApiRoute } from "@/lib/api-handler";
import { handleCrudCreate, handleCrudList } from "@/lib/crud-route";
import {
  createInvoiceLocal,
  deleteInvoiceLocal,
  getInvoiceLocal,
  listInvoicesLocal,
  updateInvoiceLocal,
} from "@/lib/erp-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const config = {
  upstreamPath: "invoices",
  listKey: "invoices",
  itemKey: "invoice",
  listLocal: listInvoicesLocal,
  createLocal: createInvoiceLocal,
  getLocal: getInvoiceLocal,
  updateLocal: updateInvoiceLocal,
  deleteLocal: deleteInvoiceLocal,
};

export const GET = withApiRoute(async () => handleCrudList(config));
export const POST = withApiRoute(async (request) => handleCrudCreate(request, config));
