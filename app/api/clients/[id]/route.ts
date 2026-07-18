import { withApiRoute } from "@/lib/api-handler";
import { ApiError } from "@/lib/api-errors";
import {
  handleCrudDelete,
  handleCrudGet,
  handleCrudUpdate,
} from "@/lib/crud-route";
import {
  createClientLocal,
  deleteClientLocal,
  getClientLocal,
  listClientsLocal,
  updateClientLocal,
} from "@/lib/workflow-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const config = {
  upstreamPath: "clients",
  listKey: "clients",
  itemKey: "client",
  listLocal: listClientsLocal,
  createLocal: createClientLocal,
  getLocal: getClientLocal,
  updateLocal: updateClientLocal,
  deleteLocal: deleteClientLocal,
};

export const GET = withApiRoute(async (_req, ctx) => {
  const id = ctx.params.id;
  if (!id) throw ApiError.badRequest("Client id is required.");
  return handleCrudGet(id, config);
});

export const PATCH = withApiRoute(async (request, ctx) => {
  const id = ctx.params.id;
  if (!id) throw ApiError.badRequest("Client id is required.");
  return handleCrudUpdate(id, request, config);
});

export const DELETE = withApiRoute(async (_req, ctx) => {
  const id = ctx.params.id;
  if (!id) throw ApiError.badRequest("Client id is required.");
  return handleCrudDelete(id, config);
});
