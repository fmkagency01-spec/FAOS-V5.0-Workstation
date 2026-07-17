'use client';

import { useEffect, useState } from 'react';
import type { AgentTask } from '@/lib/workflow-types';

const AGENTS = [
  { id: 'fmk_wig_prosthetic_hair_agent', label: 'FMK WIG Agent' },
  { id: 'fmk_mk_clothing_lifestyle_agent', label: 'MK Clothing Agent' },
  { id: 'fmk_mk_kitchen_cloud_food_agent', label: 'MK Kitchen Agent' },
  { id: 'fmk_shoes_footwear_wing', label: 'FMK Shoes Agent' },
];

export default function AgentsPage() {
  const [command, setCommand] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>(['fmk_wig_prosthetic_hair_agent']);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const loadTasks = async () => {
    const res = await fetch('/api/agent-workflow', { cache: 'no-store' });
    const data = (await res.json()) as { tasks?: AgentTask[] };
    setTasks(data.tasks || []);
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const assign = async () => {
    if (!command.trim()) {
      setMsg('Command is required');
      return;
    }
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/agent-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: command.trim(),
          client_id: clientId || undefined,
          project_id: projectId || undefined,
          agent_ids: selectedAgents,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string; source?: string };
      if (!res.ok) throw new Error(data.error || 'Assign failed');
      setMsg(`${data.message || 'Assigned'} (${data.source})`);
      setCommand('');
      await loadTasks();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Agent Workflow</h1>
        <p className="text-sm text-slate-400 mt-1">
          Assign one command — agents queue in <strong className="text-emerald-400">token-saving mode</strong> (no auto-loops).
        </p>
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs text-emerald-200">
        Token safety: max 100 AI calls/day · 280-token lean replies · circuit breaker stops drain loops.
      </div>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-4">
        <textarea
          className="input-faos min-h-[120px] font-mono text-sm"
          placeholder="Command for agents e.g. Prepare FMK WIG Q3 inventory forecast for Client XYZ…"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
        />
        <div className="grid md:grid-cols-2 gap-3">
          <input className="input-faos" placeholder="Client ID (optional)" value={clientId} onChange={(e) => setClientId(e.target.value)} />
          <input className="input-faos" placeholder="Project ID (optional)" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-300 mb-2">Assign agents</p>
          <div className="flex flex-wrap gap-2">
            {AGENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleAgent(a.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  selectedAgents.includes(a.id)
                    ? 'border-[#00f5d4] bg-[#00f5d4]/10 text-[#00f5d4]'
                    : 'border-[#2a3548] text-slate-400 hover:border-slate-500'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => void assign()} disabled={loading} className="btn-faos-primary">
          {loading ? 'Assigning…' : 'Assign workflow (single-shot)'}
        </button>
        {msg && <p className="text-xs text-slate-400">{msg}</p>}
      </div>

      <div>
        <h2 className="text-sm font-bold text-white mb-3">Task queue</h2>
        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="rounded-lg border border-[#2a3548] bg-[#111827] p-3 text-xs">
              <div className="flex justify-between gap-2">
                <span className="font-mono text-[#00f5d4]">{t.agent_id}</span>
                <span className="uppercase text-slate-500">{t.status}</span>
              </div>
              <p className="text-slate-300 mt-2 line-clamp-2">{t.command}</p>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-sm text-slate-500">No tasks queued.</p>}
        </div>
      </div>
    </div>
  );
}
