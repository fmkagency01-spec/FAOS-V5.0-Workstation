'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageShell, MsgBanner, StatCard } from '@/components/faos/erp/PageShell';
import { getMemoryNamespaces } from '@/lib/fmk-group-core';

type HubItem = {
  id: string;
  title: string;
  kind: string;
  url?: string | null;
  content?: string | null;
  memory_namespace: string;
  status: string;
  tags?: string[];
  updated_at?: string;
};

type OrchStatus = {
  engine?: string;
  system?: string;
  core_id?: string;
  autonomous_loop?: { enabled?: boolean; interval_sec?: number };
  runtime?: { ticks_completed?: number; last_tick_at?: string | null };
  source?: string;
};

export default function LearningHubPage() {
  const namespaces = getMemoryNamespaces();
  const [items, setItems] = useState<HubItem[]>([]);
  const [orch, setOrch] = useState<OrchStatus | null>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, ingested: 0 });
  const [form, setForm] = useState({
    title: '',
    kind: 'documentation',
    url: '',
    content: '',
    memory_namespace: 'fmk_aigorithm_ai_brain',
  });
  const [loading, setLoading] = useState(false);
  const [tickLoading, setTickLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [hubRes, orchRes] = await Promise.all([
      fetch('/api/learning-hub?limit=50', { cache: 'no-store' }),
      fetch('/api/orchestrate', { cache: 'no-store' }),
    ]);
    const hub = (await hubRes.json()) as {
      items?: HubItem[];
      total?: number;
      pending?: number;
      ingested?: number;
      error?: string;
    };
    if (!hubRes.ok) throw new Error(hub.error || 'Failed to load learning hub');
    setItems(hub.items || []);
    setStats({
      total: hub.total ?? (hub.items || []).length,
      pending: hub.pending ?? 0,
      ingested: hub.ingested ?? 0,
    });
    if (orchRes.ok) {
      setOrch((await orchRes.json()) as OrchStatus);
    }
  }, []);

  useEffect(() => {
    void load().catch((e) => setMsg(e instanceof Error ? e.message : 'Load failed'));
  }, [load]);

  const submit = async () => {
    if (!form.title.trim()) {
      setMsg('Title is required');
      return;
    }
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/learning-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          kind: form.kind,
          url: form.url.trim() || undefined,
          content: form.content.trim() || undefined,
          memory_namespace: form.memory_namespace,
          auto_ingest: true,
        }),
      });
      const data = (await res.json()) as { error?: string; source?: string };
      if (!res.ok) throw new Error(data.error || 'Push failed');
      setMsg(`Knowledge ingested (${data.source})`);
      setForm((f) => ({ ...f, title: '', url: '', content: '' }));
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const runTick = async () => {
    setTickLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        error?: string;
        tick_id?: string;
        source?: string;
        steps?: unknown[];
      };
      if (!res.ok) throw new Error(data.error || 'Tick failed');
      setMsg(
        `Autonomous tick ${data.tick_id} completed (${data.steps?.length || 0} jobs · ${data.source})`
      );
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Tick error');
    } finally {
      setTickLoading(false);
    }
  };

  return (
    <PageShell
      title="Learning Hub & Orchestration"
      subtitle="TAC / Aigorithm knowledge ingestion · JARVIS MATRIX autonomous routing"
      actions={
        <button
          type="button"
          onClick={() => void runTick()}
          disabled={tickLoading}
          className="btn-faos-primary text-xs"
        >
          {tickLoading ? 'Running tick…' : 'Run autonomous tick'}
        </button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Hub items" value={String(stats.total)} />
        <StatCard label="Ingested" value={String(stats.ingested)} />
        <StatCard label="Pending" value={String(stats.pending)} />
        <StatCard
          label="Matrix ticks"
          value={String(orch?.runtime?.ticks_completed ?? 0)}
        />
      </div>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-4 text-xs text-slate-300 space-y-1">
        <p>
          <span className="text-[#00f5d4] font-semibold">
            {orch?.engine || 'JARVIS MATRIX V5.0'}
          </span>
          {' · '}
          {orch?.system || '100% Autonomous'}
        </p>
        <p className="text-slate-500">
          Core: {orch?.core_id || 'fmk_group_ltd_core'} · Loop every{' '}
          {orch?.autonomous_loop?.interval_sec ?? 300}s · Last tick{' '}
          {orch?.runtime?.last_tick_at || '—'}
          {orch?.source ? ` · ${orch.source}` : ''}
        </p>
        <p className="text-slate-500">
          Pillars bound: CREATE · MEDIA · SERVICE — isolated memory for all shell brands
        </p>
      </div>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#00f5d4]">
          Push documentation / URL / course
        </h2>
        <div className="grid md:grid-cols-2 gap-3">
          <input
            className="input-faos"
            placeholder="Title *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <select
            className="input-faos"
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value })}
          >
            <option value="documentation">Documentation</option>
            <option value="url">URL</option>
            <option value="course">Course</option>
            <option value="note">Note</option>
            <option value="policy">Policy</option>
          </select>
          <input
            className="input-faos md:col-span-2"
            placeholder="URL (optional)"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
          <select
            className="input-faos md:col-span-2"
            value={form.memory_namespace}
            onChange={(e) => setForm({ ...form, memory_namespace: e.target.value })}
          >
            {namespaces.map((ns) => (
              <option key={ns.id} value={ns.id}>
                {ns.label} ({ns.id})
              </option>
            ))}
          </select>
          <textarea
            className="input-faos md:col-span-2 min-h-[100px]"
            placeholder="Content / notes for auto-ingestion into system memory"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
        </div>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={loading}
          className="btn-faos-primary"
        >
          {loading ? 'Ingesting…' : 'Push to Learning Hub'}
        </button>
        {msg && <MsgBanner msg={msg} error={/fail|error|required/i.test(msg)} />}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-white">Recent knowledge items</h2>
        {items.length === 0 && (
          <p className="text-sm text-slate-500">No items yet — push docs or URLs above.</p>
        )}
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-lg border border-[#2a3548] bg-[#111827] px-4 py-3 text-xs"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <p className="text-slate-100 font-medium">{item.title}</p>
              <span
                className={
                  item.status === 'ingested' ? 'text-emerald-400' : 'text-amber-300'
                }
              >
                {item.status}
              </span>
            </div>
            <p className="text-slate-500 mt-1">
              {item.kind} · {item.memory_namespace}
              {item.url ? ` · ${item.url}` : ''}
            </p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
