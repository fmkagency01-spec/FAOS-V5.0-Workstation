'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type BrandOption = {
  id: string;
  brand_name: string;
  channel: string;
  pillar_topic: string;
  primary_queries?: string[];
  local_signals?: string[];
  sub_brands?: string[];
};

type FanOutResult = Record<string, unknown>;

export default function AiSeoGeoConsole() {
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('fmk_wig_prosthetic_hair_agent');
  const [topic, setTopic] = useState('prosthetic hair systems Bangladesh');
  const [channel, setChannel] = useState<'internal' | 'external_b2b'>('internal');
  const [useLlm, setUseLlm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [telemetry, setTelemetry] = useState('Awaiting BulletsEye AI SEO sync...');
  const [result, setResult] = useState<FanOutResult | null>(null);
  const [error, setError] = useState('');
  const [moduleStatus, setModuleStatus] = useState('ENABLED');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ai-seo', { cache: 'no-store' });
        const data = (await res.json()) as {
          brands?: BrandOption[];
          status?: string;
          core_strategy?: string;
          agency_wing?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || `API ${res.status}`);
        if (cancelled) return;

        const list = data.brands || [];
        setBrands(list);
        setModuleStatus(data.status || 'ENABLED');
        setTelemetry(
          `${data.agency_wing || 'BulletsEye'} · ${data.core_strategy || 'Query Fan-Out'} · Module ${data.status || 'ENABLED'}`
        );

        const first = list.find((b) => b.id === 'fmk_wig_prosthetic_hair_agent') || list[0];
        if (first) {
          setSelectedBrand(first.id);
          setTopic(first.pillar_topic);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load AI SEO namespace');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedMeta = brands.find((b) => b.id === selectedBrand);

  useEffect(() => {
    if (selectedMeta?.pillar_topic) {
      setTopic(selectedMeta.pillar_topic);
    }
  }, [selectedBrand, selectedMeta?.pillar_topic]);

  const runFanOut = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fan-out',
          brand_id: selectedBrand,
          brand_name: selectedMeta?.brand_name,
          client_topic: topic,
          channel,
          use_llm: useLlm,
        }),
      });
      const data = (await res.json()) as FanOutResult & { error?: string };
      if (!res.ok) throw new Error(data.error || `Fan-out failed (${res.status})`);
      setResult(data);
      setTelemetry(
        `Fan-out ready · ${String(data.brand_name)} · source=${String(data.source)} · clusters=${Array.isArray(data.cluster_plan) ? data.cluster_plan.length : 0}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fan-out failed');
    } finally {
      setLoading(false);
    }
  };

  const fanOutQueries = Array.isArray(result?.fan_out_queries)
    ? (result?.fan_out_queries as Array<Record<string, unknown>>)
    : [];
  const h2Headers = Array.isArray(result?.recommended_h2_headers)
    ? (result?.recommended_h2_headers as string[])
    : [];
  const schemaBlocks = Array.isArray(result?.schema_blocks)
    ? (result?.schema_blocks as Array<Record<string, unknown>>)
    : [];

  return (
    <div className="min-h-screen bg-[#060b19] text-[#e2e8f0]">
      <header className="border-b border-[#1e293b] bg-[#0f172a] px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#00f5d4]">
            FAOS v5.0 · BulletsEye Agency
          </p>
          <h1 className="text-2xl font-extrabold text-white mt-1">AI SEO & GEO Engine</h1>
          <p className="text-sm text-slate-400 mt-1">
            Query Fan-Out · Extractable Content · E-E-A-T Signals · Schema JSON-LD
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono px-3 py-1 rounded-full border border-emerald-500/40 text-emerald-300 bg-emerald-500/10">
            {moduleStatus}
          </span>
          <Link
            href="/"
            className="text-sm font-semibold text-[#060b19] bg-[#00f5d4] px-4 py-2 rounded-lg hover:bg-[#00bbf9] hover:text-white transition"
          >
            ← Central Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-6 relative overflow-hidden before:absolute before:top-0 before:left-0 before:w-1 before:h-full before:bg-[#00f5d4]">
          <h2 className="text-lg font-bold text-white mb-2">Query Fan-Out Console</h2>
          <p className="text-sm text-slate-400 mb-5">
            Decompose brand topics into Direct Intent · Attribute Constraints · Comparative Need · Trust / E-E-A-T
            for AI Overviews, ChatGPT, and Perplexity citation coverage.
          </p>

          <label className="block text-xs font-bold text-slate-300 mb-2">Target Brand / Client Node</label>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full p-3 bg-[#060b19] border border-[#334155] rounded-lg text-white mb-4 text-sm"
          >
            {brands.length === 0 && (
              <option value="fmk_wig_prosthetic_hair_agent">FMK WIG</option>
            )}
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.brand_name} — {b.channel}
              </option>
            ))}
          </select>

          {selectedMeta && (
            <div className="mb-4 rounded-lg border border-[#334155] bg-[#060b19] p-4 text-xs text-slate-300 space-y-2">
              <p>
                <span className="text-[#00f5d4] font-semibold">{selectedMeta.brand_name}</span>
                {' · '}
                <code className="text-amber-300">{selectedMeta.id}</code>
              </p>
              <p className="text-slate-400">Pillar: {selectedMeta.pillar_topic}</p>
              {selectedMeta.local_signals && (
                <p className="text-slate-500">
                  Local signals: {selectedMeta.local_signals.join(' · ')}
                </p>
              )}
            </div>
          )}

          <label className="block text-xs font-bold text-slate-300 mb-2">Client / Pillar Topic</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full p-3 bg-[#060b19] border border-[#334155] rounded-lg text-white mb-4 text-sm"
            placeholder="e.g. Why choose Kadam Shoes?"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">Delivery Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as 'internal' | 'external_b2b')}
                className="w-full p-3 bg-[#060b19] border border-[#334155] rounded-lg text-white text-sm"
              >
                <option value="internal">Internal Shell Brands</option>
                <option value="external_b2b">External B2B Clients</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-slate-300 pb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useLlm}
                  onChange={(e) => setUseLlm(e.target.checked)}
                  className="rounded border-[#334155]"
                />
                Enrich via OpenRouter (falls back to deterministic GEO)
              </label>
            </div>
          </div>

          <div className="p-3 rounded-lg border-l-4 border-[#00bbf9] bg-[#060b19] text-xs text-slate-300 mb-5">
            <strong className="text-[#00bbf9]">Aigorithm:</strong> Query Fan-Out Decomposition & Extractable
            Content Parser · Namespace <code className="text-amber-300">fmk_bulletseye_core_namespace</code>
          </div>

          <button
            onClick={() => void runFanOut()}
            disabled={loading || !topic.trim()}
            className="w-full sm:w-auto bg-[#9b5de5] hover:bg-[#00bbf9] disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg text-sm transition mb-4"
          >
            {loading ? 'Running Fan-Out...' : 'Generate Fan-Out + Schema Pack'}
          </button>

          <p className="text-xs font-mono text-slate-400 mb-3">{telemetry}</p>
          {error && <p className="text-xs font-mono text-red-400 mb-3">{error}</p>}
        </div>

        {fanOutQueries.length > 0 && (
          <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Fan-Out Sub-Queries</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fanOutQueries.map((q, idx) => (
                <div
                  key={`${String(q.axis)}-${idx}`}
                  className="p-4 rounded-lg border border-[#334155] bg-[#060b19] text-xs space-y-2"
                >
                  <p className="text-[#00f5d4] font-semibold">{String(q.label || q.axis)}</p>
                  <p className="text-slate-200 font-medium">{String(q.query)}</p>
                  <p className="text-amber-300">{String(q.recommended_h2)}</p>
                  <p className="text-slate-400">{String(q.direct_answer)}</p>
                </div>
              ))}
            </div>

            {h2Headers.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2">Recommended H2 Headers</h4>
                <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1">
                  {h2Headers.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {schemaBlocks.length > 0 && (
          <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-6">
            <h3 className="text-sm font-bold text-white mb-3">JSON-LD / FAQ Schema Pack</h3>
            <pre className="p-4 bg-[#060b19] border border-dashed border-[#334155] rounded-lg text-[11px] font-mono text-[#cbd5e1] overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(schemaBlocks, null, 2)}
            </pre>
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-6">
            <h3 className="text-sm font-bold text-white mb-3">Full Execution Payload</h3>
            <pre className="p-4 bg-[#060b19] border border-dashed border-[#334155] rounded-lg text-[11px] font-mono text-[#cbd5e1] overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-6">
          <h3 className="text-sm font-bold text-white mb-3">Delivery Channels</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-[#334155] bg-[#060b19]">
              <p className="text-[#00f5d4] font-semibold mb-2">Internal Shell Brands</p>
              <p className="text-slate-400">FMK WIG · MK Clothing · FMK Shoes · TakaBachaw.com</p>
              <p className="text-slate-500 mt-2">Structured data, Direct Answer H2s, FAQ schema</p>
            </div>
            <div className="p-3 rounded-lg border border-[#334155] bg-[#060b19]">
              <p className="text-[#00f5d4] font-semibold mb-2">External B2B Clients</p>
              <p className="text-slate-400">GEO Audit · Topic Clusters · UGC / Brand Mentions</p>
              <p className="text-slate-500 mt-2">Reddit · YouTube · Facebook · Directories</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
