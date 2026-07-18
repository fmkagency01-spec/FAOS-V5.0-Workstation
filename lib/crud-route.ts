import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { jsonOk } from "@/lib/api-response";
import { fetchWorkflow } from "@/lib/workflow-api";

type CrudConfig<TLocal> = {
  upstreamPath: string;
  listKey: string;
  itemKey: string;
  listLocal: () => unknown[];
  createLocal: (body: Partial<TLocal>) => unknown;
  getLocal?: (id: string) => unknown | null;
  updateLocal?: (id: string, body: Partial<TLocal>) => unknown | null;
  deleteLocal?: (id: string) => boolean;
};

export async function handleCrudList(config: CrudConfig<unknown>) {
  const { data } = await fetchWorkflow<Record<string, unknown[]>>(config.upstreamPath);
  const rows = data?.[config.listKey];
  if (rows) return jsonOk({ source: "render", [config.listKey]: rows });
  return jsonOk({ source: "vercel-local", [config.listKey]: config.listLocal() });
}

export async function handleCrudCreate(
  request: NextRequest,
  config: CrudConfig<unknown>
) {
  const raw = await request.text();
  const { data, upstream, error } = await fetchWorkflow<Record<string, unknown>>(
    config.upstreamPath,
    { method: "POST", body: raw }
  );
  const item = data?.[config.itemKey];
  if (item) return jsonOk({ source: "render", [config.itemKey]: item }, 201);

  if (upstream && error) {
    throw ApiError.upstream(error, "Render backend rejected the request.");
  }

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    throw ApiError.badRequest("Invalid JSON body.");
  }
  const local = config.createLocal(body);
  return jsonOk({ source: "vercel-local", [config.itemKey]: local }, 201);
}

export async function handleCrudGet(id: string, config: CrudConfig<unknown>) {
  const { data } = await fetchWorkflow<Record<string, unknown>>(
    `${config.upstreamPath}/${id}`
  );
  const item = data?.[config.itemKey];
  if (item) return jsonOk({ source: "render", [config.itemKey]: item });
  if (!config.getLocal) throw ApiError.notFound(`${config.itemKey} not found`);
  const local = config.getLocal(id);
  if (!local) throw ApiError.notFound(`${config.itemKey} not found`);
  return jsonOk({ source: "vercel-local", [config.itemKey]: local });
}

export async function handleCrudUpdate(
  id: string,
  request: NextRequest,
  config: CrudConfig<unknown>
) {
  const raw = await request.text();
  const { data, upstream, error } = await fetchWorkflow<Record<string, unknown>>(
    `${config.upstreamPath}/${id}`,
    { method: "PATCH", body: raw }
  );
  const item = data?.[config.itemKey];
  if (item) return jsonOk({ source: "render", [config.itemKey]: item });

  if (upstream && error) {
    throw ApiError.upstream(error, "Render backend rejected the update.");
  }

  if (!config.updateLocal) throw ApiError.notFound(`${config.itemKey} not found`);
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    throw ApiError.badRequest("Invalid JSON body.");
  }
  const local = config.updateLocal(id, body);
  if (!local) throw ApiError.notFound(`${config.itemKey} not found`);
  return jsonOk({ source: "vercel-local", [config.itemKey]: local });
}

export async function handleCrudDelete(id: string, config: CrudConfig<unknown>) {
  const { data, upstream, error } = await fetchWorkflow<Record<string, unknown>>(
    `${config.upstreamPath}/${id}`,
    { method: "DELETE" }
  );
  if (data?.ok) return jsonOk({ source: "render", deleted: id });

  if (upstream && error) {
    throw ApiError.upstream(error, "Render backend rejected the delete.");
  }

  if (!config.deleteLocal) throw ApiError.notFound(`${config.itemKey} not found`);
  const ok = config.deleteLocal(id);
  if (!ok) throw ApiError.notFound(`${config.itemKey} not found`);
  return jsonOk({ source: "vercel-local", deleted: id });
}
