'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageShell, MsgBanner } from '@/components/faos/erp/PageShell';
import { DetailField, DetailGrid, QuickActions } from '@/components/faos/erp/QuickActions';
import { invoiceLinks } from '@/lib/erp-links';
import type { InvoiceRecord, InvoiceStatus } from '@/lib/erp-types';

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [status, setStatus] = useState<InvoiceStatus>('draft');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void fetch(`/api/invoices/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { invoice?: InvoiceRecord; error?: string }) => {
        setInvoice(d.invoice || null);
        if (d.invoice) setStatus(d.invoice.status);
        else setMsg(d.error || 'Not found');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const saveStatus = async () => {
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    const data = (await res.json()) as { invoice?: InvoiceRecord; error?: string };
    if (!res.ok) {
      setMsg(data.error || 'Update failed');
      return;
    }
    setInvoice(data.invoice || null);
    setMsg('Invoice updated');
  };

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!invoice) {
    return (
      <PageShell title="Invoice not found" backHref="/invoicing">
        <MsgBanner msg={msg} error />
      </PageShell>
    );
  }

  return (
    <PageShell title={invoice.invoice_number} subtitle={invoice.client_name} backHref="/invoicing" backLabel="← All invoices">
      <QuickActions links={invoiceLinks(invoice)} />

      <DetailGrid>
        <DetailField label="Client" value={invoice.client_name} />
        <DetailField label="Amount" value={`${invoice.currency} ${invoice.amount.toLocaleString()}`} />
        <DetailField label="Status" value={invoice.status} />
        <DetailField label="Due date" value={invoice.due_date} />
        <DetailField label="Notes" value={invoice.notes} />
        <DetailField label="ID" value={invoice.id} />
      </DetailGrid>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#00f5d4]">Update status</h2>
        <select className="input-faos" value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button type="button" onClick={() => void saveStatus()} className="btn-faos-primary">
          Save
        </button>
        <MsgBanner msg={msg} />
      </div>
    </PageShell>
  );
}
