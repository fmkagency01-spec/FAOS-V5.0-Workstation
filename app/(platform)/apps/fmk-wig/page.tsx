'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type Summary = {
  brain_node?: string;
  leads_total?: number;
  orders_active?: number;
  buyers_total?: number;
  export_skus?: number;
  import_skus?: number;
};

export default function FmkWigB2bAppPage() {
  const [summary, setSummary] = useState<Summary>({});
  const [leads, setLeads] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [harnessMsg, setHarnessMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sumRes, leadsRes] = await Promise.all([
          fetch('/api/apps/fmk-wig', { cache: 'no-store' }),
          fetch('/api/apps/fmk-wig?resource=leads', { cache: 'no-store' }),
        ]);
        const sumData = (await sumRes.json()) as { summary?: Summary };
        const leadsData = (await leadsRes.json()) as { leads?: Array<Record<string, unknown>> };
        if (!cancelled) {
          setSummary(sumData.summary || {});
          setLeads(leadsData.leads || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runHarnessSync = async () => {
    setHarnessMsg('Running Agent Gamma inventory sync...');
    const res = await fetch('/api/harness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync-inventory' }),
    });
    const data = (await res.json()) as { synced?: number; catalog_updates?: number };
    setHarnessMsg(`Gamma synced ${data.synced ?? 0} SKUs · ${data.catalog_updates ?? 0} catalog updates`);
  };

  return (
    <div className="min-h-screen bg-[#060b19] text-[#e2e8f0]">
      <header className="border-b border-[#1e293b] bg-[#0f172a] px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#00f5d4]">
            Internal B2B Engine · Jarvis Brain Node
          </p>
          <h1 className="text-2xl font-extrabold text-white mt-1">FMK Wig B2B Sourcing</h1>
          <p className="text-sm text-slate-400 mt-1">
            Global salon orders · export/import catalogs · B2B lead pipelines
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-semibold text-[#060b19] bg-[#00f5d4] px-4 py-2 rounded-lg hover:bg-[#00bbf9] hover:text-white transition"
        >
          ← Dashboard
        </Link>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'B2B Leads', value: summary.leads_total ?? '—' },
            { label: 'Active Orders', value: summary.orders_active ?? '—' },
            { label: 'Global Buyers', value: summary.buyers_total ?? '—' },
            { label: 'Export SKUs', value: summary.export_skus ?? '—' },
            { label: 'Import SKUs', value: summary.import_skus ?? '—' },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4 text-center"
            >
              <p className="text-2xl font-bold text-[#00f5d4]">{loading ? '…' : m.value}</p>
              <p className="text-[10px] uppercase text-slate-400 mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-bold text-white">B2B Lead Pipeline</h2>
            <button
              type="button"
              onClick={() => void runHarnessSync()}
              className="text-xs font-bold bg-[#9b5de5] hover:bg-[#00bbf9] text-white px-4 py-2 rounded-lg"
            >
              Agent Gamma — Sync RR Inventory
            </button>
          </div>
          {harnessMsg && <p className="text-xs font-mono text-emerald-300 mb-3">{harnessMsg}</p>}
          <div className="space-y-2">
            {leads.map((lead) => (
              <div
                key={String(lead.id)}
                className="p-3 rounded-lg border border-[#334155] bg-[#060b19] text-xs flex flex-wrap justify-between gap-2"
              >
                <span className="font-semibold text-white">{String(lead.company)}</span>
                <span className="text-slate-400">{String(lead.country)}</span>
                <span className="text-amber-300">{String(lead.pipeline_stage)}</span>
                <span className="text-[#00f5d4]">${String(lead.estimated_value_usd)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-6 text-xs text-slate-400">
          <p className="font-semibold text-slate-200 mb-2">Brain Node</p>
          <code className="text-amber-300">fmk_wig_internal_engine</code>
          <p className="mt-2">
            Node backend: <code>apps/fmk-wig</code> · API:{' '}
            <code>/api/apps/fmk-wig</code>
          </p>
        </div>
      </main>
    </div>
  );
}
