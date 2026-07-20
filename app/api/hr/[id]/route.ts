import { withApiRoute } from "@/lib/api-handler";
import { ApiError } from "@/lib/api-errors";
import { handleCrudDelete, handleCrudGet } from "@/lib/crud-route";
import { jsonOk } from "@/lib/api-response";
import { fetchWorkflow } from "@/lib/workflow-api";
import {
  deleteEmployeeLocal,
  getEmployeeLocal,
  updateEmployeeLocal,
} from "@/lib/erp-store";
import { parseJsonWithSchema } from "@/lib/validation/parse";
import { employeeUpdateSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const config = {
  upstreamPath: "employees",
  listKey: "employees",
  itemKey: "employee",
  listLocal: () => [],
  createLocal: () => ({}),
  getLocal: getEmployeeLocal,
  updateLocal: updateEmployeeLocal,
  deleteLocal: deleteEmployeeLocal,
};

export const GET = withApiRoute(async (_req, ctx) => {
  const id = ctx.params?.id;
  if (!id) throw ApiError.badRequest("Employee id is required.");
  return handleCrudGet(id, config);
});

export const PATCH = withApiRoute(async (request, ctx) => {
  const id = ctx.params?.id;
  if (!id) throw ApiError.badRequest("Employee id is required.");
  const body = await parseJsonWithSchema(request, employeeUpdateSchema);
  const { data, upstream, error } = await fetchWorkflow<{ employee: unknown }>(
    `employees/${id}`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
  if (data?.employee) return jsonOk({ source: "render", employee: data.employee });
  if (upstream && error) throw ApiError.upstream(error);
  const employee = updateEmployeeLocal(id, body);
  if (!employee) throw ApiError.notFound("Employee not found");
  return jsonOk({ source: "vercel-local", employee });
});

export const DELETE = withApiRoute(async (_req, ctx) => {
  const id = ctx.params?.id;
  if (!id) throw ApiError.badRequest("Employee id is required.");
  return handleCrudDelete(id, config);
});
