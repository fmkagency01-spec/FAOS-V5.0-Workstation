'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
    void fetch(`/api/projects${q}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: { projects?: ProjectRecord[] }) => setProjects(data.projects || []));
  }, [clientFilter]);

  const submit = async () => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ client_id: clientFilter, name: '', command_brief: '', priority: 'normal' });
      const q = clientFilter ? `?client_id=${encodeURIComponent(clientFilter)}` : '';
      const list = await fetch(`/api/projects${q}`, { cache: 'no-store' });
      const data = (await list.json()) as { projects?: ProjectRecord[] };
      setProjects(data.projects || []);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Projects</h1>
        <p className="text-sm text-slate-400 mt-1">Project boards with command briefs for agent routing.</p>
      </div>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-3">
        <input className="input-faos" placeholder="Project name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input-faos" placeholder="Client ID (optional)" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} />
        <textarea className="input-faos min-h-[80px]" placeholder="Command brief for agents" value={form.command_brief} onChange={(e) => setForm({ ...form, command_brief: e.target.value })} />
        <select className="input-faos" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as ProjectRecord['priority'] })}>
          <option value="low">Low priority</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
        <button type="button" onClick={() => void submit()} className="btn-faos-primary">Create project</button>
      </div>

      <div className="grid gap-3">
        {projects.map((p) => (
          <div key={p.id} className="rounded-lg border border-[#2a3548] bg-[#111827] p-4">
            <div className="flex justify-between items-start gap-2">
              <p className="font-semibold text-white">{p.name}</p>
              <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-[#00f5d4]/10 text-[#00f5d4]">{p.status}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 line-clamp-2">{p.command_brief || 'No brief'}</p>
            <p className="text-[10px] font-mono text-slate-600 mt-2">{p.id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading projects…</div>}>
      <ProjectsInner />
    </Suspense>
  );
}
