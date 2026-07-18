'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/faos/erp/PageShell';
import { RecordLink } from '@/components/faos/erp/RecordLink';
import type { ProjectRecord } from '@/lib/workflow-types';

function ProjectsInner() {
  const params = useSearchParams();
  const clientFilter = params.get('client') || '';
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [form, setForm] = useState({
    client_id: clientFilter,
    name: '',
    command_brief: '',
    priority: 'normal' as ProjectRecord['priority'],
  });

  useEffect(() => {
    setForm((f) => ({ ...f, client_id: clientFilter }));
    const q = clientFilter ? `?client_id=${encodeURIComponent(clientFilter)}` : '';
    void fetch(`/api/projects${q}`, { cache: 'no-store', credentials: 'include' })
      .then((res) => res.json())
      .then((data: { projects?: ProjectRecord[] }) => setProjects(data.projects || []));
  }, [clientFilter]);

  const submit = async () => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ client_id: clientFilter, name: '', command_brief: '', priority: 'normal' });
      const q = clientFilter ? `?client_id=${encodeURIComponent(clientFilter)}` : '';
      const list = await fetch(`/api/projects${q}`, { cache: 'no-store', credentials: 'include' });
      const data = (await list.json()) as { projects?: ProjectRecord[] };
      setProjects(data.projects || []);
    }
  };

  return (
    <PageShell
      title="Projects"
      subtitle="Project boards — tap for details, client link & agent shortcuts."
    >
      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-3">
        <input className="input-faos" placeholder="Project name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input-faos" placeholder="Client ID (optional)" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} />
        <textarea className="input-faos min-h-[80px]" placeholder="Command brief for agents" value={form.command_brief} onChange={(e) => setForm({ ...form, command_brief: e.target.value })} />
        <select className="input-faos" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as ProjectRecord['priority'] })}>
          <option value="low">Low priority</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
        <button type="button" onClick={() => void submit()} className="btn-faos-primary">
          Create project
        </button>
      </div>

      <div className="space-y-2">
        {projects.map((p) => (
          <RecordLink
            key={p.id}
            href={`/projects/${p.id}`}
            title={p.name}
            subtitle={p.command_brief || 'No brief'}
            meta={p.id}
            badge={
              <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-[#00f5d4]/10 text-[#00f5d4]">
                {p.status}
              </span>
            }
          />
        ))}
        {projects.length === 0 && <p className="text-sm text-slate-500">No projects yet.</p>}
      </div>
    </PageShell>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading projects…</div>}>
      <ProjectsInner />
    </Suspense>
  );
}
