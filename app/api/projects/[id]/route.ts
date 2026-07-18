import { withApiRoute } from "@/lib/api-handler";
import { ApiError } from "@/lib/api-errors";
import {
  handleCrudDelete,
  handleCrudGet,
  handleCrudUpdate,
} from "@/lib/crud-route";
import {
  createProjectLocal,
  deleteProjectLocal,
  getProjectLocal,
  listProjectsLocal,
  updateProjectLocal,
} from "@/lib/workflow-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const config = {
  upstreamPath: "projects",
  listKey: "projects",
  itemKey: "project",
  listLocal: listProjectsLocal,
  createLocal: createProjectLocal,
  getLocal: getProjectLocal,
  updateLocal: updateProjectLocal,
  deleteLocal: deleteProjectLocal,
};

export const GET = withApiRoute(async (_req, ctx) => {
  const id = ctx.params.id;
  if (!id) throw ApiError.badRequest("Project id is required.");
  return handleCrudGet(id, config);
});

export const PATCH = withApiRoute(async (request, ctx) => {
  const id = ctx.params.id;
  if (!id) throw ApiError.badRequest("Project id is required.");
  return handleCrudUpdate(id, request, config);
});

export const DELETE = withApiRoute(async (_req, ctx) => {
  const id = ctx.params.id;
  if (!id) throw ApiError.badRequest("Project id is required.");
  return handleCrudDelete(id, config);
});
