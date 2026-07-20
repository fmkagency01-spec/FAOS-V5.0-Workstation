'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageShell, MsgBanner } from '@/components/faos/erp/PageShell';
import { DetailField, DetailGrid, QuickActions } from '@/components/faos/erp/QuickActions';
import { orderLinks } from '@/lib/erp-links';
import type { OrderRecord, OrderStatus } from '@/lib/erp-types';

export default function OrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await fetch(`/api/orders/${id}`, { credentials: 'include' });
      const data = (await res.json()) as { order?: OrderRecord; error?: string };
      if (cancelled) return;
      if (data.order) {
        setOrder(data.order);
        setStatus(data.order.status);
      } else {
        setMsg(data.error || 'Not found');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const saveStatus = async () => {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    const data = (await res.json()) as { order?: OrderRecord; error?: string };
    if (!res.ok) {
      setMsg(data.error || 'Update failed');
      return;
    }
    setOrder(data.order || null);
    setMsg('Status updated');
  };

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!order) {
    return (
      <PageShell title="Order not found" backHref="/orders">
        <MsgBanner msg={msg} error />
      </PageShell>
    );
  }

  return (
    <PageShell title={order.order_number} subtitle={`${order.client_name} · ${order.status}`} backHref="/orders" backLabel="← All orders">
      <QuickActions links={orderLinks(order)} />

      <DetailGrid>
        <DetailField label="Client" value={order.client_name} />
        <DetailField label="Product" value={order.product_name || '—'} />
        <DetailField label="Quantity" value={String(order.quantity)} />
        <DetailField label="Unit price" value={`${order.currency} ${order.unit_price}`} />
        <DetailField label="Total" value={`${order.currency} ${order.total.toLocaleString()}`} />
        <DetailField label="Status" value={order.status} />
        <DetailField label="Notes" value={order.notes} />
        <DetailField label="ID" value={order.id} />
      </DetailGrid>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#00f5d4]">Update status</h2>
        <select className="input-faos" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button type="button" onClick={() => void saveStatus()} className="btn-faos-primary">
          Save status
        </button>
        <MsgBanner msg={msg} />
      </div>
    </PageShell>
  );
}
