'use client';

import { useCallback, useEffect, useState } from 'react';

type DiagnosticsReport = {
  ok: boolean;
  version: string;
  expected_agents: number;
  found_agents: number;
  orchestrator: string;
  summary: string;
  findings: Array<{ agent_id: string; ok: boolean; issues: string[]; name?: string; domain?: string }>;
};

type PipelineResult = {
  ok: boolean;
  pipeline_id: string;
  stage: string;
  assigned_agents: string[];
  qa: { score: number; passed: boolean } | null;
  approval: {
    status: string;
    client_facing_output: string;
    ready_for_publish: boolean;
  } | null;
  agent_states: Array<{
    agent_id: string;
    status: string;
    current_task: string | null;
    timestamp: string;
  }>;
};

type StatusPayload = {
  version?: string;
  agents_total?: number;
  orchestrator?: string;
  message?: string;
  hermes?: {
    summary?: string;
    agents_active?: number;
    agents_total?: number;
    ok?: boolean;
  };
  brain?: {
    label?: string;
    heritage?: string;
    ascii?: string;
    hubs?: Array<{
      id: string;
      title: string;
      lead_agent_id: string;
      capabilities: string[];
    }>;
  };
};

export default function FaosV6Page() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsReport | null>(null);
  const [brief, setBrief] = useState(
    'SMM brief for BulletsEye: 5 Instagram posts + CTA for FMK WIG prosthetic hair launch'
  );
  const [brand, setBrand] = useState('BulletsEye');
  const [pipeline, setPipeline] = useState<PipelineResult | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/faos-v6?view=status', { cache: 'no-store' });
    const data = (await res.json()) as StatusPayload & { ok?: boolean };
    setStatus(data);
  }, []);

  const runDiagnostics = useCallback(async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/faos-v6?view=diagnostics', { cache: 'no-store' });
      const data = (await res.json()) as { diagnostics?: DiagnosticsReport; error?: string };
      if (!res.ok) throw new Error(data.error || 'Diagnostics failed');
      setDiagnostics(data.diagnostics || null);
      setMsg(data.diagnostics?.summary || 'Diagnostics complete');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Diagnostics error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    void runDiagnostics();
  }, [loadStatus, runDiagnostics]);

  const simulatePipeline = async () => {
    if (!brief.trim()) {
      setMsg('Brief details required');
      return;
    }
    setLoading(true);
    setMsg('');
    setPipeline(null);
    try {
      const res = await fetch('/api/faos-v6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pipeline',
          details: brief.trim(),
          brand: brand.trim() || 'BulletsEye',
          auto_approve: true,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        result?: PipelineResult;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Pipeline failed');
      setPipeline(data.result || null);
      setMsg(
        data.result
          ? `Pipeline ${data.result.pipeline_id} · stage ${data.result.stage} · QA ${data.result.qa?.score ?? '—'}`
          : 'Pipeline complete'
      );
      await loadStatus();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Pipeline error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">FAOS v6.0 Controller</h1>
        <p className="text-sm text-slate-400 mt-1">
          Jarvis Brain + Hermes Engine · 3 hubs · 38 agents · ingest → execute → QA → approval
        </p>
      </div>

      {status?.brain?.hubs && (
        <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-white">
              {status.brain.label || 'JARVIS BRAIN + HERMES ENGINE'}
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Heritage layout: {status.brain.heritage || 'FAOS v5.3 + HERMES ENGINE'}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {status.brain.hubs.map((hub) => (
              <div
                key={hub.id}
                className="rounded-lg border border-[#2a3548] bg-[#0b1220] p-3 space-y-2"
              >
                <p className="text-xs font-bold text-[#00f5d4]">{hub.title}</p>
                <p className="text-[10px] font-mono text-slate-500">{hub.lead_agent_id}</p>
                <ul className="text-[11px] text-slate-300 space-y-1">
                  {hub.capabilities.map((cap) => (
                    <li key={cap}>· {cap}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {status.brain.ascii && (
            <pre className="text-[10px] text-slate-400 whitespace-pre overflow-x-auto rounded-lg border border-[#2a3548] bg-[#0b1220] p-3">
              {status.brain.ascii}
            </pre>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-3 text-xs">
        <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-4">
          <p className="text-slate-500 uppercase tracking-wide">Version</p>
          <p className="text-[#00f5d4] font-mono mt-1">{status?.version || '6.0.0'}</p>
        </div>
        <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-4">
          <p className="text-slate-500 uppercase tracking-wide">Agents</p>
          <p className="text-white font-mono mt-1">{status?.agents_total ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-4">
          <p className="text-slate-500 uppercase tracking-wide">Orchestrator</p>
          <p className="text-white font-mono mt-1">{status?.orchestrator || 'jarvis_core'}</p>
        </div>
        <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-4">
          <p className="text-slate-500 uppercase tracking-wide">Hermes Co-Founder</p>
          <p className={`font-mono mt-1 ${status?.hermes?.ok === false ? 'text-amber-300' : 'text-emerald-300'}`}>
            {status?.hermes?.agents_active != null
              ? `${status.hermes.agents_active}/${status.hermes.agents_total ?? '—'}`
              : 'online'}
          </p>
        </div>
      </div>

      {status?.hermes?.summary && (
        <p className="text-xs text-slate-400">{status.hermes.summary}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          className="btn-faos-primary text-xs"
          onClick={async () => {
            setLoading(true);
            try {
              const res = await fetch('/api/faos-v6', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'activate', details: 'dashboard_activate_all' }),
              });
              const data = (await res.json()) as { hermes?: StatusPayload['hermes']; activation?: { activated?: number }; error?: string };
              if (!res.ok) throw new Error(data.error || 'Activate failed');
              setMsg(`Activated ${data.activation?.activated ?? '—'} agents · Hermes monitoring`);
              await loadStatus();
              await runDiagnostics();
            } catch (e) {
              setMsg(e instanceof Error ? e.message : 'Activate error');
            } finally {
              setLoading(false);
            }
          }}
        >
          Activate all agents (Hermes)
        </button>
      </div>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-white">Agent diagnostics</h2>
          <button
            type="button"
            onClick={() => void runDiagnostics()}
            disabled={loading}
            className="btn-faos-primary text-xs"
          >
            {loading ? 'Running…' : 'Re-run diagnostics'}
          </button>
        </div>
        {diagnostics && (
          <>
            <p className={`text-xs ${diagnostics.ok ? 'text-emerald-300' : 'text-amber-300'}`}>
              {diagnostics.summary}
            </p>
            <div className="max-h-48 overflow-auto space-y-1">
              {diagnostics.findings
                .filter((f) => f.agent_id !== '_roster')
                .map((f) => (
                  <div
                    key={f.agent_id}
                    className="flex justify-between gap-2 text-[11px] border-b border-[#2a3548]/80 py-1"
                  >
                    <span className="font-mono text-slate-300">
                      {f.name || f.agent_id}
                      {f.domain ? ` · ${f.domain}` : ''}
                    </span>
                    <span className={f.ok ? 'text-emerald-400' : 'text-rose-400'}>
                      {f.ok ? 'ok' : f.issues.join(', ')}
                    </span>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-4">
        <h2 className="text-sm font-bold text-white">Simulate client task pipeline</h2>
        <input
          className="input-faos"
          placeholder="Brand (e.g. BulletsEye)"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />
        <textarea
          className="input-faos min-h-[120px] font-mono text-sm"
          placeholder="Raw brief — SMM, performance ads, video script, design…"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
        />
        <button
          type="button"
          onClick={() => void simulatePipeline()}
          disabled={loading}
          className="btn-faos-primary"
        >
          {loading ? 'Processing…' : 'Run end-to-end pipeline'}
        </button>
        {msg && <p className="text-xs text-slate-400">{msg}</p>}
      </div>

      {pipeline && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
          <h2 className="text-sm font-bold text-white">Pipeline result</h2>
          <p className="text-xs text-slate-300 font-mono">
            {pipeline.pipeline_id} · {pipeline.stage} · agents:{' '}
            {pipeline.assigned_agents.join(', ')}
          </p>
          <div className="flex flex-wrap gap-2">
            {pipeline.agent_states.map((s) => (
              <span
                key={`${s.agent_id}-${s.timestamp}`}
                className="text-[10px] px-2 py-1 rounded border border-[#2a3548] text-slate-300"
              >
                {s.agent_id}: {s.status}
              </span>
            ))}
          </div>
          {pipeline.approval?.client_facing_output && (
            <pre className="text-[11px] text-slate-300 whitespace-pre-wrap max-h-80 overflow-auto rounded-lg border border-[#2a3548] bg-[#0b1220] p-3">
              {pipeline.approval.client_facing_output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
