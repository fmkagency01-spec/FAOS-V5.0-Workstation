'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type Summary = {
  tenant_id?: string;
  sessions_mtd?: number;
  ad_spend_mtd?: number;
  linkedin_leads?: number;
  seo_keywords?: number;
  factory_skus?: number;
  open_inquiries?: number;
};

export default function RrWigsClientWorkspacePage() {
  const [summary, setSummary] = useState<Summary>({});
  const [inquiries, setInquiries] = useState<Array<Record<string, unknown>>>([]);
  const [harnessSteps, setHarnessSteps] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sumRes, inqRes] = await Promise.all([
          fetch('/api/apps/rr-wigs', { cache: 'no-store' }),
          fetch('/api/apps/rr-wigs?resource=inquiries', { cache: 'no-store' }),
        ]);
        const sumData = (await sumRes.json()) as { summary?: Summary };
        const inqData = (await inqRes.json()) as { inquiries?: Array<Record<string, unknown>> };
        if (!cancelled) {
          setSummary(sumData.summary || {});
          setInquiries(inqData.inquiries || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runHarnessCycle = async () => {
    const res = await fetch('/api/harness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = (await res.json()) as { steps?: Array<Record<string, unknown>> };
    setHarnessSteps(data.steps || []);
  };

  return (
    <div className="min-h-screen bg-[#060b19] text-[#e2e8f0]">
      <header className="border-b border-[#1e293b] bg-[#0f172a] px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#9b5de5]">
            Isolated Tenant · BulletsEye Agency Client
          </p>
          <h1 className="text-2xl font-extrabold text-white mt-1">RR Wigs Workspace</h1>
          <p className="text-sm text-slate-400 mt-1">
            Web analytics · ad spend · LinkedIn leads · SEO · factory inventory
          </p>
        </div>
        <Link
          href="/clients"
          className="text-sm font-semibold text-[#060b19] bg-[#9b5de5] px-4 py-2 rounded-lg hover:bg-[#00bbf9] hover:text-white transition"
        >
          ← CRM
        </Link>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="p-3 rounded-lg border border-[#9b5de5]/30 bg-[#9b5de5]/5 text-xs text-slate-300">
          Dedicated isolated tenant dashboard — scoped to RR Wigs manufacturing partner under
          FMK Agency BulletsEye wing.
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Sessions MTD', value: summary.sessions_mtd ?? '—' },
            { label: 'Ad Spend MTD', value: summary.ad_spend_mtd ? `$${summary.ad_spend_mtd}` : '—' },
            { label: 'LinkedIn Leads', value: summary.linkedin_leads ?? '—' },
            { label: 'Open Inquiries', value: summary.open_inquiries ?? '—' },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4 text-center"
            >
              <p className="text-2xl font-bold text-[#9b5de5]">{loading ? '…' : m.value}</p>
              <p className="text-[10px] uppercase text-slate-400 mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-bold text-white">B2B Inquiries</h2>
            <button
              type="button"
              onClick={() => void runHarnessCycle()}
              className="text-xs font-bold bg-[#00f5d4] hover:bg-[#00bbf9] text-[#060b19] px-4 py-2 rounded-lg"
            >
              Run Harness Cycle (Alpha + Beta + Gamma)
            </button>
          </div>
          <div className="space-y-2 mb-4">
            {inquiries.map((inq) => (
              <div
                key={String(inq.id)}
                className="p-3 rounded-lg border border-[#334155] bg-[#060b19] text-xs"
              >
                <p className="font-semibold text-white">{String(inq.company)}</p>
                <p className="text-slate-400">{String(inq.contact_email)}</p>
                <p className="text-slate-500 mt-1">{String(inq.message)}</p>
              </div>
            ))}
          </div>
          {harnessSteps.length > 0 && (
            <div className="space-y-2 border-t border-[#334155] pt-4">
              <h3 className="text-xs font-bold text-slate-300">Harness Pipeline</h3>
              {harnessSteps.map((step) => (
                <div key={String(step.worker)} className="text-xs text-slate-400 font-mono">
                  {String(step.codename)} · {String(step.summary)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-6 text-xs text-slate-400">
          <p className="font-semibold text-slate-200 mb-2">Brain Node · Tenant</p>
          <code className="text-amber-300">rr_wigs_client_workspace</code>
          <p className="mt-2">
            Node backend: <code>apps/rr-wigs</code> · Inquiry API:{' '}
            <code>/api/apps/rr-wigs/inquiry</code>
          </p>
        </div>
      </main>
    </div>
  );
}
