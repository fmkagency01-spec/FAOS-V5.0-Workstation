'use client';

import { useEffect, useState } from 'react';
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
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">CRM & Clients</h1>
        <p className="text-sm text-slate-400 mt-1">Manage clients — synced to Render backend when online.</p>
      </div>

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
        {msg && <p className="text-xs text-slate-400">{msg}</p>}
      </div>

      <div className="space-y-2">
        {clients.map((c) => (
          <div key={c.id} className="rounded-lg border border-[#2a3548] bg-[#111827] p-4 flex justify-between gap-4">
            <div>
              <p className="font-semibold text-white">{c.name}</p>
              <p className="text-xs text-slate-500">{c.industry || '—'} · {c.contact_email || 'no email'}</p>
              <p className="text-[10px] font-mono text-slate-600 mt-1">{c.id}</p>
            </div>
            <LinkClientProjects clientId={c.id} />
          </div>
        ))}
        {clients.length === 0 && <p className="text-sm text-slate-500">No clients yet.</p>}
      </div>
    </div>
  );
}

function LinkClientProjects({ clientId }: { clientId: string }) {
  return (
    <a href={`/projects?client=${clientId}`} className="text-xs text-[#00bbf9] hover:underline shrink-0">
      Projects →
    </a>
  );
}
