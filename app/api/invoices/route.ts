import { withApiRoute } from "@/lib/api-handler";
import { handleCrudList } from "@/lib/crud-route";
import { ApiError } from "@/lib/api-errors";
import { jsonOk } from "@/lib/api-response";
import { fetchWorkflow } from "@/lib/workflow-api";
import {
  createInvoiceLocal,
  deleteInvoiceLocal,
  getInvoiceLocal,
  listInvoicesLocal,
  updateInvoiceLocal,
} from "@/lib/erp-store";
import { parseJsonWithSchema } from "@/lib/validation/parse";
import { invoiceCreateSchema } from "@/lib/validation/schemas";

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

export const POST = withApiRoute(async (request) => {
  const body = await parseJsonWithSchema(request, invoiceCreateSchema);
  const { data, upstream, error } = await fetchWorkflow<{ invoice: unknown }>(
    "invoices",
    { method: "POST", body: JSON.stringify(body) }
  );
  if (data?.invoice) return jsonOk({ source: "render", invoice: data.invoice }, 201);
  if (upstream && error) throw ApiError.upstream(error);
  const invoice = createInvoiceLocal(body);
  return jsonOk({ source: "vercel-local", invoice }, 201);
});
