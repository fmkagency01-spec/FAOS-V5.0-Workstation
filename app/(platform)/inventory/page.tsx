'use client';

import { useEffect, useState } from 'react';
import type { InventoryRecord } from '@/lib/erp-types';

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryRecord[]>([]);
  const [form, setForm] = useState({
    sku: '',
    name: '',
    category: '',
    quantity: '',
    reorder_level: '10',
    location: 'Main Warehouse',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const res = await fetch('/api/inventory', { cache: 'no-store' });
    const data = (await res.json()) as { inventory?: InventoryRecord[] };
    setItems(data.inventory || []);
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: form.sku || undefined,
          name: form.name,
          category: form.category || 'General',
          quantity: parseInt(form.quantity, 10) || 0,
          reorder_level: parseInt(form.reorder_level, 10) || 10,
          location: form.location,
        }),
      });
      const data = (await res.json()) as { source?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMsg(`Stock saved (${data.source})`);
      setForm({ sku: '', name: '', category: '', quantity: '', reorder_level: '10', location: 'Main Warehouse' });
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const lowStock = items.filter((i) => i.quantity <= i.reorder_level);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Inventory</h1>
        <p className="text-sm text-slate-400 mt-1">SKU & stock management — JARVIS: &quot;Add stock for WIG-SKU-100&quot;</p>
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-200">
          ⚠ {lowStock.length} item(s) at or below reorder level
        </div>
      )}

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#00f5d4]">Add stock item</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="input-faos" placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <input className="input-faos" placeholder="Product name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input-faos" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input className="input-faos" placeholder="Quantity" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <input className="input-faos" placeholder="Reorder level" type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
          <input className="input-faos" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>
        <button type="button" onClick={() => void submit()} disabled={loading} className="btn-faos-primary">
          {loading ? 'Saving…' : 'Add item'}
        </button>
        {msg && <p className="text-xs text-slate-400">{msg}</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 border-b border-[#2a3548]">
              <th className="py-2 pr-4">SKU</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Qty</th>
              <th className="py-2 pr-4">Location</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-[#2a3548]/50 text-slate-300">
                <td className="py-3 pr-4 font-mono text-[#00f5d4]">{item.sku}</td>
                <td className="py-3 pr-4">{item.name}</td>
                <td className="py-3 pr-4">{item.quantity}</td>
                <td className="py-3 pr-4">{item.location}</td>
                <td className="py-3">
                  {item.quantity <= item.reorder_level ? (
                    <span className="text-amber-400">Low</span>
                  ) : (
                    <span className="text-emerald-400">OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="text-sm text-slate-500 py-4">No inventory items.</p>}
      </div>
    </div>
  );
}
