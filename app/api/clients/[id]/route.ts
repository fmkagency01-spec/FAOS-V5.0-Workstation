import { withApiRoute } from '@/lib/api-handler';
import { ApiError } from '@/lib/api-errors';
import { jsonOk } from '@/lib/api-response';
import { fetchWorkflow } from '@/lib/workflow-api';
import { getClientLocal, listClientsLocal } from '@/lib/workflow-store';
import type { ClientRecord } from '@/lib/workflow-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function resolveClient(id: string): Promise<{ client: ClientRecord; source: string }> {
  const { data } = await fetchWorkflow<{ clients: ClientRecord[] }>('clients');
  const fromRender = data?.clients?.find((c) => c.id === id);
  if (fromRender) return { client: fromRender, source: 'render' };

  const local = getClientLocal(id);
  if (local) return { client: local, source: 'vercel-local' };

  const fromList = listClientsLocal().find((c) => c.id === id);
  if (fromList) return { client: fromList, source: 'vercel-local' };

  throw ApiError.notFound('Client not found.');
}

export const GET = withApiRoute(async (_req, ctx) => {
  const id = ctx.params.id;
  const { client, source } = await resolveClient(id);
  return jsonOk({ source, client });
});
