import { withApiRoute } from "@/lib/api-handler";
import { handleCrudList } from "@/lib/crud-route";
import { ApiError } from "@/lib/api-errors";
import { jsonOk } from "@/lib/api-response";
import { fetchWorkflow } from "@/lib/workflow-api";
import {
  createEmployeeLocal,
  deleteEmployeeLocal,
  getEmployeeLocal,
  listEmployeesLocal,
  updateEmployeeLocal,
} from "@/lib/erp-store";
import { parseJsonWithSchema } from "@/lib/validation/parse";
import { employeeCreateSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const config = {
  upstreamPath: "employees",
  listKey: "employees",
  itemKey: "employee",
  listLocal: listEmployeesLocal,
  createLocal: createEmployeeLocal,
  getLocal: getEmployeeLocal,
  updateLocal: updateEmployeeLocal,
  deleteLocal: deleteEmployeeLocal,
};

export const GET = withApiRoute(async () => handleCrudList(config));

export const POST = withApiRoute(async (request) => {
  const body = await parseJsonWithSchema(request, employeeCreateSchema);
  const { data, upstream, error } = await fetchWorkflow<{ employee: unknown }>(
    "employees",
    { method: "POST", body: JSON.stringify(body) }
  );
  if (data?.employee) return jsonOk({ source: "render", employee: data.employee }, 201);
  if (upstream && error) throw ApiError.upstream(error);
  const employee = createEmployeeLocal(body);
  return jsonOk({ source: "vercel-local", employee }, 201);
});
