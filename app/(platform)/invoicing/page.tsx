'use client';

import { useEffect, useState } from 'react';
import type { InvoiceRecord } from '@/lib/erp-types';

export default function InvoicingPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [form, setForm] = useState({
    client_name: '',
    amount: '',
    currency: 'USD',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const res = await fetch('/api/invoices', { cache: 'no-store' });
    const data = (await res.json()) as { invoices?: InvoiceRecord[] };
    setInvoices(data.invoices || []);
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async () => {
    if (!form.client_name.trim()) return;
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: form.client_name,
          amount: parseFloat(form.amount) || 0,
          currency: form.currency,
          notes: form.notes,
          status: 'draft',
        }),
      });
      const data = (await res.json()) as { source?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMsg(`Invoice created (${data.source})`);
      setForm({ client_name: '', amount: '', currency: 'USD', notes: '' });
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const total = invoices.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Invoicing</h1>
        <p className="text-sm text-slate-400 mt-1">Billing & payments — synced to Render · JARVIS can create invoices by voice.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="Invoices" value={String(invoices.length)} />
        <Stat label="Total billed" value={`$${total.toLocaleString()}`} />
        <Stat label="Draft" value={String(invoices.filter((i) => i.status === 'draft').length)} />
      </div>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#00f5d4]">New invoice</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="input-faos" placeholder="Client name *" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
          <input className="input-faos" placeholder="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input className="input-faos" placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          <input className="input-faos md:col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button type="button" onClick={() => void submit()} disabled={loading} className="btn-faos-primary">
          {loading ? 'Saving…' : 'Create invoice'}
        </button>
        {msg && <p className="text-xs text-slate-400">{msg}</p>}
      </div>

      <div className="space-y-2">
        {invoices.map((inv) => (
          <div key={inv.id} className="rounded-lg border border-[#2a3548] bg-[#111827] p-4 flex justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-white">{inv.invoice_number}</p>
              <p className="text-sm text-slate-300">{inv.client_name}</p>
              <p className="text-[10px] font-mono text-slate-600">{inv.id}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-[#00f5d4]">
                {inv.currency} {inv.amount.toLocaleString()}
              </p>
              <p className="text-xs uppercase text-slate-500">{inv.status}</p>
            </div>
          </div>
        ))}
        {invoices.length === 0 && <p className="text-sm text-slate-500">No invoices yet.</p>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#2a3548] bg-[#111827] p-4">
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}
