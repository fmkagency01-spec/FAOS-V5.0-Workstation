import { withApiRoute } from "@/lib/api-handler";
import { ApiError } from "@/lib/api-errors";
import { handleCrudDelete, handleCrudGet } from "@/lib/crud-route";
import { jsonOk } from "@/lib/api-response";
import { fetchWorkflow } from "@/lib/workflow-api";
import {
  deleteInvoiceLocal,
  getInvoiceLocal,
  updateInvoiceLocal,
} from "@/lib/erp-store";
import { parseJsonWithSchema } from "@/lib/validation/parse";
import { invoiceUpdateSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const config = {
  upstreamPath: "invoices",
  listKey: "invoices",
  itemKey: "invoice",
  listLocal: () => [],
  createLocal: () => ({}),
  getLocal: getInvoiceLocal,
  updateLocal: updateInvoiceLocal,
  deleteLocal: deleteInvoiceLocal,
};

export const GET = withApiRoute(async (_req, ctx) => {
  const id = ctx.params?.id;
  if (!id) throw ApiError.badRequest("Invoice id is required.");
  return handleCrudGet(id, config);
});

export const PATCH = withApiRoute(async (request, ctx) => {
  const id = ctx.params?.id;
  if (!id) throw ApiError.badRequest("Invoice id is required.");
  const body = await parseJsonWithSchema(request, invoiceUpdateSchema);
  const { data, upstream, error } = await fetchWorkflow<{ invoice: unknown }>(
    `invoices/${id}`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
  if (data?.invoice) return jsonOk({ source: "render", invoice: data.invoice });
  if (upstream && error) throw ApiError.upstream(error);
  const invoice = updateInvoiceLocal(id, body);
  if (!invoice) throw ApiError.notFound("Invoice not found");
  return jsonOk({ source: "vercel-local", invoice });
});

export const DELETE = withApiRoute(async (_req, ctx) => {
  const id = ctx.params?.id;
  if (!id) throw ApiError.badRequest("Invoice id is required.");
  return handleCrudDelete(id, config);
});
