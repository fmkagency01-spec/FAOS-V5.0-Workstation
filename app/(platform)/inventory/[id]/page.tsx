'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageShell, MsgBanner } from '@/components/faos/erp/PageShell';
import { DetailField, DetailGrid, QuickActions } from '@/components/faos/erp/QuickActions';
import { inventoryLinks } from '@/lib/erp-links';
import type { InventoryRecord } from '@/lib/erp-types';

export default function InventoryDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [item, setItem] = useState<InventoryRecord | null>(null);
  const [delta, setDelta] = useState('0');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/inventory/${id}`, { credentials: 'include' });
      const data = (await res.json()) as { item?: InventoryRecord; error?: string };
      if (cancelled) return;
      setItem(data.item || null);
      if (!data.item) setMsg(data.error || 'Not found');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const adjust = async () => {
    const res = await fetch('/api/inventory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, delta: parseInt(delta, 10) || 0 }),
    });
    const data = (await res.json()) as { item?: InventoryRecord; error?: string };
    if (!res.ok) {
      setMsg(data.error || 'Adjust failed');
      return;
    }
    setItem(data.item || null);
    setDelta('0');
    setMsg('Stock adjusted');
  };

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!item) {
    return (
      <PageShell title="Item not found" backHref="/inventory">
        <MsgBanner msg={msg} error />
      </PageShell>
    );
  }

  const low = item.quantity <= item.reorder_level;

  return (
    <PageShell title={item.name} subtitle={item.sku} backHref="/inventory" backLabel="← All stock">
      <QuickActions links={inventoryLinks(item.id)} />

      {low && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
          Low stock — at or below reorder level ({item.reorder_level})
        </div>
      )}

      <DetailGrid>
        <DetailField label="SKU" value={item.sku} />
        <DetailField label="Quantity" value={String(item.quantity)} />
        <DetailField label="Reorder level" value={String(item.reorder_level)} />
        <DetailField label="Location" value={item.location} />
        <DetailField label="Unit cost" value={`$${item.unit_cost}`} />
        <DetailField label="Category" value={item.category} />
        <DetailField label="ID" value={item.id} />
      </DetailGrid>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#00f5d4]">Adjust stock</h2>
        <input className="input-faos" type="number" placeholder="Delta (+/-)" value={delta} onChange={(e) => setDelta(e.target.value)} />
        <button type="button" onClick={() => void adjust()} className="btn-faos-primary">
          Apply adjustment
        </button>
        <MsgBanner msg={msg} />
      </div>
    </PageShell>
  );
}
