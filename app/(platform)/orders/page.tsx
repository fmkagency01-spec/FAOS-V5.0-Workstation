'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageShell, StatCard, MsgBanner } from '@/components/faos/erp/PageShell';
import { RecordLink } from '@/components/faos/erp/RecordLink';
import type { OrderRecord } from '@/lib/erp-types';

function OrdersInner() {
  const params = useSearchParams();
  const prefillClient = params.get('client') || '';
  const prefillProduct = params.get('product') || '';

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [form, setForm] = useState({
    client_name: prefillClient,
    product_name: '',
    product_id: prefillProduct,
    quantity: '1',
    unit_price: '',
    currency: 'USD',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const res = await fetch('/api/orders', { cache: 'no-store', credentials: 'include' });
    const data = (await res.json()) as { orders?: OrderRecord[] };
    setOrders(data.orders || []);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (prefillClient) setForm((f) => ({ ...f, client_name: prefillClient }));
    if (prefillProduct) setForm((f) => ({ ...f, product_id: prefillProduct }));
  }, [prefillClient, prefillProduct]);

  const submit = async () => {
    if (!form.client_name.trim()) return;
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          client_name: form.client_name,
          product_id: form.product_id,
          product_name: form.product_name,
          quantity: parseInt(form.quantity, 10) || 1,
          unit_price: parseFloat(form.unit_price) || 0,
          currency: form.currency,
          notes: form.notes,
          status: 'pending',
        }),
      });
      const data = (await res.json()) as { source?: string; error?: string; order?: OrderRecord };
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMsg(`Order created (${data.source})`);
      setForm({
        client_name: prefillClient,
        product_name: '',
        product_id: prefillProduct,
        quantity: '1',
        unit_price: '',
        currency: 'USD',
        notes: '',
      });
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const pending = orders.filter((o) => o.status === 'pending').length;
  const revenue = orders.reduce((s, o) => s + o.total, 0);

  return (
    <PageShell
      title="Orders"
      subtitle="Sales orders — link to clients, products, and invoices for smooth workflow."
    >
      <div className="grid sm:grid-cols-3 gap-3">
        <StatCard label="Total orders" value={String(orders.length)} />
        <StatCard label="Pending" value={String(pending)} />
        <StatCard label="Order value" value={`$${revenue.toLocaleString()}`} />
      </div>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#00f5d4]">New order</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="input-faos" placeholder="Client name *" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
          <input className="input-faos" placeholder="Product name" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
          <input className="input-faos" placeholder="Quantity" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <input className="input-faos" placeholder="Unit price" type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
          <input className="input-faos" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button type="button" onClick={() => void submit()} disabled={loading} className="btn-faos-primary">
          {loading ? 'Saving…' : 'Create order'}
        </button>
        <MsgBanner msg={msg} error={msg.toLowerCase().includes('error') || msg.toLowerCase().includes('fail')} />
      </div>

      <div className="space-y-2">
        {orders.map((o) => (
          <RecordLink
            key={o.id}
            href={`/orders/${o.id}`}
            title={o.order_number}
            subtitle={`${o.client_name} · ${o.product_name || 'No product'} · Qty ${o.quantity}`}
            meta={o.id}
            badge={
              <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-[#00f5d4]/10 text-[#00f5d4]">
                {o.status}
              </span>
            }
            right={
              <span className="text-sm font-bold text-[#00f5d4]">
                {o.currency} {o.total.toLocaleString()}
              </span>
            }
          />
        ))}
        {orders.length === 0 && <p className="text-sm text-slate-500">No orders yet.</p>}
      </div>
    </PageShell>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading orders…</div>}>
      <OrdersInner />
    </Suspense>
  );
}
