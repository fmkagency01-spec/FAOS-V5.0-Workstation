'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageShell, StatCard, MsgBanner } from '@/components/faos/erp/PageShell';
import { RecordLink } from '@/components/faos/erp/RecordLink';
import type { ProductRecord } from '@/lib/erp-types';

function ProductsInner() {
  const params = useSearchParams();
  const prefillFromOrder = params.get('product') || '';

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [form, setForm] = useState({
    sku: '',
    name: '',
    category: 'General',
    description: '',
    unit_price: '',
    currency: 'USD',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const res = await fetch('/api/products', { cache: 'no-store', credentials: 'include' });
    const data = (await res.json()) as { products?: ProductRecord[] };
    setProducts(data.products || []);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (prefillFromOrder && products.length) {
      const p = products.find((x) => x.id === prefillFromOrder);
      if (p) setForm((f) => ({ ...f, name: p.name, sku: p.sku, unit_price: String(p.unit_price) }));
    }
  }, [prefillFromOrder, products]);

  const submit = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sku: form.sku || undefined,
          name: form.name,
          category: form.category,
          description: form.description,
          unit_price: parseFloat(form.unit_price) || 0,
          currency: form.currency,
          active: true,
        }),
      });
      const data = (await res.json()) as { source?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMsg(`Product saved (${data.source})`);
      setForm({ sku: '', name: '', category: 'General', description: '', unit_price: '', currency: 'USD' });
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const active = products.filter((p) => p.active).length;

  return (
    <PageShell title="Products" subtitle="Product catalog — link to orders and inventory for fast workflow.">
      <div className="grid sm:grid-cols-2 gap-3">
        <StatCard label="Catalog items" value={String(products.length)} />
        <StatCard label="Active" value={String(active)} />
      </div>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#00f5d4]">Add product</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="input-faos" placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <input className="input-faos" placeholder="Product name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input-faos" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input className="input-faos" placeholder="Unit price" type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
          <input className="input-faos md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <button type="button" onClick={() => void submit()} disabled={loading} className="btn-faos-primary">
          {loading ? 'Saving…' : 'Add product'}
        </button>
        <MsgBanner msg={msg} />
      </div>

      <div className="space-y-2">
        {products.map((p) => (
          <RecordLink
            key={p.id}
            href={`/products/${p.id}`}
            title={p.name}
            subtitle={`${p.sku} · ${p.category}`}
            meta={p.id}
            badge={
              <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${p.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                {p.active ? 'Active' : 'Inactive'}
              </span>
            }
            right={
              <span className="text-sm font-bold text-[#00f5d4]">
                {p.currency} {p.unit_price.toLocaleString()}
              </span>
            }
          />
        ))}
        {products.length === 0 && <p className="text-sm text-slate-500">No products yet.</p>}
      </div>
    </PageShell>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading products…</div>}>
      <ProductsInner />
    </Suspense>
  );
}
