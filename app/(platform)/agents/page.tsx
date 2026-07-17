'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AgentTask } from '@/lib/workflow-types';
import { routeQuery, suggestBrandAgent } from '@/lib/ai-router';

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
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [autoExecute, setAutoExecute] = useState(true);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const preview = useMemo(
    () => (command.trim() ? routeQuery(command.trim(), true) : null),
    [command]
  );

  useEffect(() => {
    if (command.trim() && selectedAgents.length === 0) {
      setSelectedAgents([suggestBrandAgent(command)]);
    }
  }, [command, selectedAgents.length]);

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
          agent_ids: selectedAgents.length ? selectedAgents : undefined,
          auto_execute: autoExecute,
          task_type: preview?.taskType,
        }),
      });
      const data = (await res.json()) as {
        message?: string;
        error?: string;
        source?: string;
        route?: { label?: string; task_type?: string };
      };
      if (!res.ok) throw new Error(data.error || 'Assign failed');
      setMsg(
        `${data.message || 'Assigned'} · ${data.route?.label || ''} (${data.source})`
      );
      setCommand('');
      await loadTasks();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const executeOne = async (taskId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/agent-workflow', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Execute failed');
      await loadTasks();
      setMsg('Task delivered via AI gateway');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Execute error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Agent Workflow</h1>
        <p className="text-sm text-slate-400 mt-1">
          One command — best AI model auto-selected (Claude / GPT / Gemini). No separate AI tabs.
        </p>
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs text-emerald-200">
        Smart routing: creative → Claude · video → Gemini · code → GPT · strategy → Claude ·
        token-saving single-shot delivery.
      </div>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-4">
        <textarea
          className="input-faos min-h-[120px] font-mono text-sm"
          placeholder="Any command — graphics, video edit, inventory, strategy…"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
        />
        {preview && (
          <p className="text-[11px] text-[#00f5d4]/80">
            → {preview.label} · task: {preview.taskType} · {preview.reason}
          </p>
        )}
        <div className="grid md:grid-cols-2 gap-3">
          <input className="input-faos" placeholder="Client ID (optional)" value={clientId} onChange={(e) => setClientId(e.target.value)} />
          <input className="input-faos" placeholder="Project ID (optional)" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-300 mb-2">Brand agents (auto-suggested)</p>
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
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={autoExecute}
            onChange={(e) => setAutoExecute(e.target.checked)}
            className="accent-[#00f5d4]"
          />
          Auto-deliver via best AI model (recommended)
        </label>
        <button type="button" onClick={() => void assign()} disabled={loading} className="btn-faos-primary">
          {loading ? 'Working…' : 'Assign & deliver'}
        </button>
        {msg && <p className="text-xs text-slate-400">{msg}</p>}
      </div>

      <div>
        <h2 className="text-sm font-bold text-white mb-3">Task queue</h2>
        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="rounded-lg border border-[#2a3548] bg-[#111827] p-3 text-xs">
              <div className="flex justify-between gap-2 flex-wrap">
                <span className="font-mono text-[#00f5d4]">{t.agent_id}</span>
                <span className="uppercase text-slate-500">{t.status}</span>
              </div>
              {(t.route_label || t.task_type) && (
                <p className="text-[10px] text-slate-500 mt-1">
                  {[t.route_label, t.task_type, t.selected_model].filter(Boolean).join(' · ')}
                </p>
              )}
              <p className="text-slate-300 mt-2 line-clamp-2">{t.command}</p>
              {t.deliverable && (
                <p className="text-slate-400 mt-2 line-clamp-3 border-t border-[#2a3548] pt-2">
                  {t.deliverable}
                </p>
              )}
              {t.status === 'queued' && (
                <button
                  type="button"
                  onClick={() => void executeOne(t.id)}
                  className="mt-2 text-[10px] text-[#00f5d4] hover:underline"
                >
                  Execute now
                </button>
              )}
            </div>
          ))}
          {tasks.length === 0 && <p className="text-sm text-slate-500">No tasks queued.</p>}
        </div>
      </div>
    </div>
  );
}
