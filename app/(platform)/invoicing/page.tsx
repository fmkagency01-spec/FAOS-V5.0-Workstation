'use client';

import { useEffect, useState } from 'react';
import { PageShell, StatCard, MsgBanner } from '@/components/faos/erp/PageShell';
import { RecordLink } from '@/components/faos/erp/RecordLink';
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
    <PageShell title="Invoicing" subtitle="Billing & payments — tap any invoice for details & shortcuts.">
      <div className="grid sm:grid-cols-3 gap-3">
        <StatCard label="Invoices" value={String(invoices.length)} />
        <StatCard label="Total billed" value={`$${total.toLocaleString()}`} />
        <StatCard label="Draft" value={String(invoices.filter((i) => i.status === 'draft').length)} />
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
        {msg && <MsgBanner msg={msg} />}
      </div>

      <div className="space-y-2">
        {invoices.map((inv) => (
          <RecordLink
            key={inv.id}
            href={`/invoicing/${inv.id}`}
            title={inv.invoice_number}
            subtitle={inv.client_name}
            meta={inv.id}
            badge={
              <span className="text-[10px] uppercase text-slate-500">{inv.status}</span>
            }
            right={
              <span className="text-lg font-bold text-[#00f5d4]">
                {inv.currency} {inv.amount.toLocaleString()}
              </span>
            }
          />
        ))}
        {invoices.length === 0 && <p className="text-sm text-slate-500">No invoices yet.</p>}
      </div>
    </PageShell>
  );
}
