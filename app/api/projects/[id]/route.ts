import { withApiRoute } from '@/lib/api-handler';
import { ApiError } from '@/lib/api-errors';
import { jsonOk } from '@/lib/api-response';
import { fetchWorkflow } from '@/lib/workflow-api';
import { getProjectLocal, listProjectsLocal } from '@/lib/workflow-store';
import type { ProjectRecord } from '@/lib/workflow-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function resolveProject(id: string): Promise<{ project: ProjectRecord; source: string }> {
  const { data } = await fetchWorkflow<{ projects: ProjectRecord[] }>('projects');
  const fromRender = data?.projects?.find((p) => p.id === id);
  if (fromRender) return { project: fromRender, source: 'render' };

  const local = getProjectLocal(id);
  if (local) return { project: local, source: 'vercel-local' };

  const fromList = listProjectsLocal().find((p) => p.id === id);
  if (fromList) return { project: fromList, source: 'vercel-local' };

  throw ApiError.notFound('Project not found.');
}

export const GET = withApiRoute(async (_req, ctx) => {
  const id = ctx.params.id;
  const { project, source } = await resolveProject(id);
  return jsonOk({ source, project });
});
