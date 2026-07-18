'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageShell, MsgBanner } from '@/components/faos/erp/PageShell';
import { DetailField, DetailGrid, QuickActions } from '@/components/faos/erp/QuickActions';
import { clientLinks } from '@/lib/erp-links';
import type { ClientRecord } from '@/lib/workflow-types';

export default function ClientDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void fetch(`/api/clients/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { client?: ClientRecord; error?: string }) => {
        setClient(d.client || null);
        if (!d.client) setMsg(d.error || 'Not found');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!client) {
    return (
      <PageShell title="Client not found" backHref="/clients">
        <MsgBanner msg={msg} error />
      </PageShell>
    );
  }

  return (
    <PageShell title={client.name} subtitle={client.industry || 'Client profile'} backHref="/clients" backLabel="← All clients">
      <QuickActions links={clientLinks(client.id, client.name)} />

      <DetailGrid>
        <DetailField label="Industry" value={client.industry} />
        <DetailField label="Email" value={client.contact_email} />
        <DetailField label="Assigned agent" value={client.assigned_agent} />
        <DetailField label="Notes" value={client.notes} />
        <DetailField label="Created" value={new Date(client.created_at).toLocaleDateString()} />
        <DetailField label="ID" value={client.id} />
      </DetailGrid>
    </PageShell>
  );
}
