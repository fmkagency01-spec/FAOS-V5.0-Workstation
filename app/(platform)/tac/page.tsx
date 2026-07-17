'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  getAgentsForPillar,
  getJarvisConfig,
  getParentCompany,
  getPillars,
  type TacPillar,
} from '@/lib/tac-ecosystem';

type TacStatus = {
  last_sync?: string | null;
  pillars?: Array<{ id: string; name: string; sync: string; agent_count: number }>;
};

export default function TacCommandCenterPage() {
  const parent = getParentCompany();
  const pillars = getPillars();
  const jarvis = getJarvisConfig();

  const [status, setStatus] = useState<TacStatus | null>(null);
  const [command, setCommand] = useState('');
  const [pillarId, setPillarId] = useState('create');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/tac', { cache: 'no-store' });
    const data = (await res.json()) as TacStatus & { ok?: boolean };
    if (data.ok) setStatus(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sync = async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/tac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setMsg(data.message || 'Synced');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const dispatch = async () => {
    if (!command.trim()) return;
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/tac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispatch', command: command.trim(), pillar_id: pillarId }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Dispatch failed');
      setMsg(data.message || 'Dispatched');
      setCommand('');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 pb-24 md:pb-8">
      {/* TAC Brain Header */}
      <div className="rounded-2xl border border-[#00f5d4]/30 bg-gradient-to-br from-[#00f5d4]/10 via-[#111827] to-[#0c1222] p-6 md:p-8">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#00f5d4] font-bold">
          TAC Central Brain · v5.3
        </p>
        <h1 className="text-2xl md:text-4xl font-black text-white mt-2">{parent.tac_brain}</h1>
        <p className="text-sm text-slate-400 mt-2">{parent.name} · {parent.hub}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            {parent.aigorithm_engine} Active
          </span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-[#00f5d4]/10 text-[#00f5d4] border border-[#00f5d4]/30">
            {jarvis.shell_agents_total} Shell Agents
          </span>
          {status?.last_sync && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-slate-500/10 text-slate-400">
              Last sync: {new Date(status.last_sync).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-6">
          <button type="button" onClick={() => void sync()} disabled={loading} className="btn-faos-primary min-h-[48px]">
            {loading ? 'Syncing…' : '⟳ Sync All Pillars'}
          </button>
          <Link href="/jarvis" className="inline-flex items-center min-h-[48px] px-4 rounded-md border border-[#2a3548] text-sm text-[#00f5d4] hover:bg-white/5">
            🧠 JARVIS Command
          </Link>
        </div>
        {msg && <p className="text-xs text-slate-400 mt-3">{msg}</p>}
      </div>

      {/* Gatekeeper Protocol */}
      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-4">
        <p className="text-xs font-bold text-amber-400">Aigorithm Gatekeeper Protocol</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {parent.gatekeeper_protocol.map((step, i) => (
            <span key={step} className="text-[10px] flex items-center gap-1 text-slate-400">
              {i > 0 && <span className="text-slate-600">→</span>}
              <span className="px-2 py-1 rounded bg-[#0c1222] border border-[#2a3548]">{step}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 3 Pillars */}
      <div className="grid md:grid-cols-3 gap-4">
        {pillars.map((pillar) => (
          <PillarCard key={pillar.id} pillar={pillar} syncStatus={status?.pillars?.find((p) => p.id === pillar.id)?.sync} />
        ))}
      </div>

      {/* TAC Dispatch */}
      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-4">
        <h2 className="text-sm font-bold text-white">TAC Command Dispatch</h2>
        <p className="text-xs text-slate-500">Route executive commands to a pillar — JARVIS agents execute on backend.</p>
        <select
          className="input-faos input-mobile max-w-xs"
          value={pillarId}
          onChange={(e) => setPillarId(e.target.value)}
        >
          {pillars.map((p) => (
            <option key={p.id} value={p.id}>
              {p.icon} {p.name}
            </option>
          ))}
        </select>
        <textarea
          className="input-faos min-h-[100px] input-mobile"
          placeholder="e.g. Sync FMK WIG factory inventory after visit · Prepare client onboarding workflow…"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
        />
        <button type="button" onClick={() => void dispatch()} disabled={loading || !command.trim()} className="btn-faos-primary min-h-[48px]">
          Dispatch via TAC Brain
        </button>
      </div>
    </div>
  );
}

function PillarCard({ pillar, syncStatus }: { pillar: TacPillar; syncStatus?: string }) {
  const agents = getAgentsForPillar(pillar.id);

  return (
    <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 flex flex-col gap-4 hover:border-[#00f5d4]/30 transition">
      <div>
        <span className="text-3xl">{pillar.icon}</span>
        <h3 className="font-bold text-white mt-2">{pillar.name}</h3>
        <p className="text-[11px] text-slate-500">{pillar.subtitle}</p>
        {syncStatus && (
          <span className={`inline-block mt-2 text-[9px] uppercase px-2 py-0.5 rounded ${syncStatus === 'online' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
            {syncStatus}
          </span>
        )}
      </div>

      <div>
        <p className="text-[10px] uppercase text-slate-600 mb-2">Work sections</p>
        <div className="space-y-1">
          {pillar.work_sections.map((ws) => (
            <div key={ws.id} className="text-[11px] text-slate-400 flex justify-between gap-2">
              <span>{ws.label}</span>
              <span className="text-slate-600 truncate">{ws.agent.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase text-slate-600 mb-2">Agents ({agents.length})</p>
        <div className="flex flex-wrap gap-1">
          {agents.slice(0, 4).map((a) => (
            <span key={a.id} className="text-[9px] px-1.5 py-0.5 rounded bg-[#0c1222] text-slate-500" title={a.name}>
              {a.icon}
            </span>
          ))}
          {agents.length > 4 && <span className="text-[9px] text-slate-600">+{agents.length - 4}</span>}
        </div>
      </div>

      <Link href={pillar.route} className="text-xs text-[#00bbf9] hover:underline mt-auto min-h-[44px] flex items-center">
        Open {pillar.name} →
      </Link>
    </div>
  );
}
