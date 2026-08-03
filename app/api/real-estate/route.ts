import { withApiRoute } from "@/lib/api-handler";
import { ApiError } from "@/lib/api-errors";
import { jsonOk } from "@/lib/api-response";
import { parseJsonWithSchema } from "@/lib/validation/parse";
import {
  reClientCreateSchema,
  reDealCreateSchema,
  reLeadCreateSchema,
  reProjectCreateSchema,
} from "@/lib/validation/schemas";
import {
  createReClient,
  createReDeal,
  createReLead,
  createReProject,
  getRealEstateHubSnapshot,
  listReClients,
  listReDeals,
  listReLeads,
  listReProjects,
  reAnalytics,
  updateReLeadStatus,
} from "@/lib/real-estate-store";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const leadStatusPatchSchema = z.object({
  id: z.string().trim().min(1).max(80),
  status: z.enum([
    "new",
    "contacted",
    "qualified",
    "site_visit",
    "negotiation",
    "won",
    "lost",
  ]),
});

export const GET = withApiRoute(async (request) => {
  const url = new URL(request.url);
  const section = url.searchParams.get("section") || "overview";
  const clientId = url.searchParams.get("client_id") || undefined;
  const projectId = url.searchParams.get("project_id") || undefined;

  if (section === "clients") {
    return jsonOk({ source: "vercel-local", clients: listReClients() });
  }
  if (section === "projects") {
    return jsonOk({
      source: "vercel-local",
      projects: listReProjects(clientId),
      clients: listReClients(),
    });
  }
  if (section === "leads") {
    return jsonOk({
      source: "vercel-local",
      leads: listReLeads(projectId),
      projects: listReProjects(),
    });
  }
  if (section === "deals") {
    return jsonOk({
      source: "vercel-local",
      deals: listReDeals(projectId),
      projects: listReProjects(),
      leads: listReLeads(),
    });
  }
  if (section === "analytics") {
    return jsonOk({ source: "vercel-local", analytics: reAnalytics() });
  }

  return jsonOk({ source: "vercel-local", ...getRealEstateHubSnapshot() });
});

export const POST = withApiRoute(async (request) => {
  const url = new URL(request.url);
  const section = url.searchParams.get("section") || "";

  try {
    if (section === "clients") {
      const body = await parseJsonWithSchema(request, reClientCreateSchema);
      const client = createReClient(body);
      return jsonOk({ source: "vercel-local", client }, 201);
    }
    if (section === "projects") {
      const body = await parseJsonWithSchema(request, reProjectCreateSchema);
      const project = createReProject(body);
      return jsonOk({ source: "vercel-local", project }, 201);
    }
    if (section === "leads") {
      const body = await parseJsonWithSchema(request, reLeadCreateSchema);
      const lead = createReLead(body);
      return jsonOk({ source: "vercel-local", lead }, 201);
    }
    if (section === "deals") {
      const body = await parseJsonWithSchema(request, reDealCreateSchema);
      const deal = createReDeal(body);
      return jsonOk({ source: "vercel-local", deal }, 201);
    }
    if (section === "lead-status") {
      const body = await parseJsonWithSchema(request, leadStatusPatchSchema);
      const lead = updateReLeadStatus(body.id, body.status);
      return jsonOk({ source: "vercel-local", lead });
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.badRequest(err instanceof Error ? err.message : "Invalid request");
  }

  throw ApiError.badRequest(
    "Unknown section. Use section=clients|projects|leads|deals|lead-status"
  );
});
