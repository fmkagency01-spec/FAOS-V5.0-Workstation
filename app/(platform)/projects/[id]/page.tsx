'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageShell, MsgBanner } from '@/components/faos/erp/PageShell';
import { DetailField, DetailGrid, QuickActions } from '@/components/faos/erp/QuickActions';
import { projectLinks } from '@/lib/erp-links';
import type { ProjectRecord } from '@/lib/workflow-types';

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void fetch(`/api/projects/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { project?: ProjectRecord; error?: string }) => {
        setProject(d.project || null);
        if (!d.project) setMsg(d.error || 'Not found');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!project) {
    return (
      <PageShell title="Project not found" backHref="/projects">
        <MsgBanner msg={msg} error />
      </PageShell>
    );
  }

  return (
    <PageShell title={project.name} subtitle={`${project.status} · ${project.priority} priority`} backHref="/projects" backLabel="← All projects">
      <QuickActions links={projectLinks(project)} />

      <DetailGrid>
        <DetailField label="Status" value={project.status} />
        <DetailField label="Priority" value={project.priority} />
        <DetailField label="Client ID" value={project.client_id} />
        <DetailField label="Agents" value={project.assigned_agents?.join(', ')} />
        <DetailField label="Brief" value={project.command_brief} />
        <DetailField label="ID" value={project.id} />
      </DetailGrid>
    </PageShell>
  );
}
