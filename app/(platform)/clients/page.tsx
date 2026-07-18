'use client';

import { useEffect, useState } from 'react';
import { PageShell, MsgBanner } from '@/components/faos/erp/PageShell';
import { RecordLink } from '@/components/faos/erp/RecordLink';
import type { ClientRecord } from '@/lib/workflow-types';

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [form, setForm] = useState({ name: '', industry: '', contact_email: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const res = await fetch('/api/clients', { cache: 'no-store' });
    const data = (await res.json()) as { clients?: ClientRecord[] };
    setClients(data.clients || []);
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { source?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMsg(`Client saved (${data.source || 'ok'})`);
      setForm({ name: '', industry: '', contact_email: '', notes: '' });
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="CRM & Clients" subtitle="Manage clients — tap for profile, projects & order shortcuts.">

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#00f5d4]">New client</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="input-faos" placeholder="Client name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input-faos" placeholder="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
          <input className="input-faos" placeholder="Email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          <input className="input-faos md:col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button type="button" onClick={() => void submit()} disabled={loading} className="btn-faos-primary">
          {loading ? 'Saving…' : 'Add client'}
        </button>
        {msg && <MsgBanner msg={msg} />}
      </div>

      <div className="space-y-2">
        {clients.map((c) => (
          <RecordLink
            key={c.id}
            href={`/clients/${c.id}`}
            title={c.name}
            subtitle={`${c.industry || '—'} · ${c.contact_email || 'no email'}`}
            meta={c.id}
          />
        ))}
        {clients.length === 0 && <p className="text-sm text-slate-500">No clients yet.</p>}
      </div>
    </PageShell>
  );
}
