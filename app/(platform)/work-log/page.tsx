'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageShell, MsgBanner, StatCard } from '@/components/faos/erp/PageShell';
import type { AgentTask } from '@/lib/workflow-types';
import type {
  DailyWorkLog,
  ProjectHealth,
  WorkLogDashboardStats,
} from '@/lib/work-log-types';

type FormState = {
  log_date: string;
  member_name: string;
  member_role: string;
  tasks_completed: string;
  tasks_in_progress: string;
  blockers: string;
  next_day_plan: string;
  project_health: ProjectHealth;
  backend_notes: string;
};

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function linesToList(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter(Boolean);
}

/** Parse "Name - 70%" or "Name: 40" lines into in-progress items. */
function parseInProgress(text: string): Array<{ name: string; progress_pct: number }> {
  return linesToList(text).map((line) => {
    const match = line.match(/^(.+?)(?:\s*[-–:]\s*|\s+)(\d{1,3})\s*%?\s*$/);
    if (match) {
      return {
        name: (match[1] || line).trim(),
        progress_pct: Math.min(100, Math.max(0, Number(match[2]) || 0)),
      };
    }
    return { name: line, progress_pct: 0 };
  });
}

function healthLabel(h: ProjectHealth): string {
  if (h === 'on_track') return 'On Track · ঠিকঠাক চলছে';
  if (h === 'at_risk') return 'At Risk · সামান্য দেরি';
  return 'Blocked · আটকে আছে';
}

function healthClass(h: ProjectHealth): string {
  if (h === 'on_track') return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
  if (h === 'at_risk') return 'text-amber-300 border-amber-500/40 bg-amber-500/10';
  return 'text-red-300 border-red-500/40 bg-red-500/10';
}

function taskStatusClass(status: AgentTask['status']): string {
  if (status === 'done') return 'text-emerald-400';
  if (status === 'running' || status === 'queued') return 'text-sky-400';
  if (status === 'blocked') return 'text-red-300';
  return 'text-amber-300';
}

const emptyForm = (): FormState => ({
  log_date: todayLocal(),
  member_name: '',
  member_role: '',
  tasks_completed: '',
  tasks_in_progress: '',
  blockers: '',
  next_day_plan: '',
  project_health: 'on_track',
  backend_notes: '',
});

export default function WorkLogPage() {
  const [logs, setLogs] = useState<DailyWorkLog[]>([]);
  const [stats, setStats] = useState<WorkLogDashboardStats | null>(null);
  const [agentActivity, setAgentActivity] = useState<AgentTask[]>([]);
  const [filterDate, setFilterDate] = useState(todayLocal());
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [source, setSource] = useState('');

  const load = useCallback(async (date: string) => {
    const res = await fetch(`/api/work-log?date=${encodeURIComponent(date)}&activity=1`, {
      cache: 'no-store',
    });
    const data = (await res.json()) as {
      logs?: DailyWorkLog[];
      stats?: WorkLogDashboardStats;
      agent_activity?: AgentTask[];
      source?: string;
      error?: string;
    };
    if (!res.ok) throw new Error(data.error || 'Failed to load work logs');
    setLogs(data.logs || []);
    setStats(data.stats || null);
    setAgentActivity(data.agent_activity || []);
    setSource(data.source || '');
  }, []);

  useEffect(() => {
    void fetch('/api/auth/session')
      .then((r) => r.json())
      .then((d: { user?: { name?: string; role?: string } }) => {
        if (d.user?.name || d.user?.role) {
          setForm((prev) => ({
            ...prev,
            member_name: prev.member_name || d.user?.name || '',
            member_role: prev.member_role || d.user?.role || '',
          }));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void load(filterDate).catch((e) =>
      setMsg(e instanceof Error ? e.message : 'Load failed')
    );
  }, [filterDate, load]);

  const submit = async () => {
    if (!form.member_name.trim()) {
      setMsg('Member name is required · নাম লিখুন');
      return;
    }
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/work-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_date: form.log_date,
          member_name: form.member_name.trim(),
          member_role: form.member_role.trim() || 'Team',
          tasks_completed: linesToList(form.tasks_completed),
          tasks_in_progress: parseInProgress(form.tasks_in_progress),
          blockers: linesToList(form.blockers),
          next_day_plan: linesToList(form.next_day_plan),
          project_health: form.project_health,
          backend_notes: form.backend_notes.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { source?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setMsg(`Daily log saved (${data.source})`);
      setForm((prev) => ({
        ...emptyForm(),
        member_name: prev.member_name,
        member_role: prev.member_role,
        log_date: filterDate,
      }));
      await load(filterDate);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this daily log?')) return;
    const res = await fetch(`/api/work-log/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setMsg(data.error || 'Delete failed');
      return;
    }
    setMsg('Log deleted');
    await load(filterDate);
  };

  const blockedOrRisk = (stats?.blocked || 0) + (stats?.at_risk || 0);

  return (
    <PageShell
      title="Daily Work Log"
      subtitle="FAOS / BulletsEye — দৈনিক কাজ ট্র্যাকিং · team + agent progress monitoring"
      actions={
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input-faos text-sm"
            value={filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value);
              setForm((prev) => ({ ...prev, log_date: e.target.value }));
            }}
          />
          {source && (
            <span className="text-[10px] uppercase tracking-wide text-slate-500">
              {source}
            </span>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Logs today" value={String(stats?.total_today ?? 0)} />
        <StatCard label="Members logged" value={String(stats?.members_logged_today ?? 0)} />
        <StatCard label="On track" value={String(stats?.on_track ?? 0)} />
        <StatCard
          label="At risk / blocked"
          value={String(blockedOrRisk)}
        />
      </div>

      {blockedOrRisk > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
          Attention: {stats?.at_risk || 0} at-risk and {stats?.blocked || 0} blocked
          log(s) for this day — follow up so work does not stay paused.
        </div>
      )}

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-4">
        <div className="border-b border-[#2a3548] pb-3">
          <h2 className="text-sm font-bold text-[#00f5d4]">
            FAOS / BULLETSEYE DAILY WORK LOG FORM
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Submit once per day · প্রতিদিন একবার পূরণ করুন
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="text-[10px] uppercase text-slate-500">📅 তারিখ / Date</span>
            <input
              type="date"
              className="input-faos w-full"
              value={form.log_date}
              onChange={(e) => setForm({ ...form, log_date: e.target.value })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase text-slate-500">👤 নাম / Member</span>
            <input
              className="input-faos w-full"
              placeholder="Name"
              value={form.member_name}
              onChange={(e) => setForm({ ...form, member_name: e.target.value })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase text-slate-500">ভূমিকা / Role</span>
            <input
              className="input-faos w-full"
              placeholder="e.g. team_lead / creative"
              value={form.member_role}
              onChange={(e) => setForm({ ...form, member_role: e.target.value })}
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-slate-500">
            ১. সম্পন্ন কাজ · Tasks completed (one per line)
          </span>
          <textarea
            className="input-faos w-full min-h-[88px]"
            placeholder={"- RR Wigs API health check\n- FMK Wig catalog sync"}
            value={form.tasks_completed}
            onChange={(e) => setForm({ ...form, tasks_completed: e.target.value })}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-slate-500">
            ২. চলমান কাজ · In-progress (Name - 70%)
          </span>
          <textarea
            className="input-faos w-full min-h-[88px]"
            placeholder={"RR Wigs Backend Setup - 70%\nFMK Wig B2B Catalog - 40%"}
            value={form.tasks_in_progress}
            onChange={(e) => setForm({ ...form, tasks_in_progress: e.target.value })}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-slate-500">
            ৩. ব্লকার · Blockers / issues
          </span>
          <textarea
            className="input-faos w-full min-h-[72px]"
            placeholder="Waiting on Render wake-up / OpenRouter key missing…"
            value={form.blockers}
            onChange={(e) => setForm({ ...form, blockers: e.target.value })}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-slate-500">
            ৪. আগামীকাল · Next-day action plan
          </span>
          <textarea
            className="input-faos w-full min-h-[72px]"
            placeholder={"Finish SEO GEO fan-out QA\nUnblock agent workflow deploy"}
            value={form.next_day_plan}
            onChange={(e) => setForm({ ...form, next_day_plan: e.target.value })}
          />
        </label>

        <div className="space-y-2">
          <span className="text-[10px] uppercase text-slate-500">
            ৫. প্রজেক্ট স্ট্যাটাস · Overall health
          </span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['on_track', 'On Track (ঠিকঠাক)'],
                ['at_risk', 'At Risk (দেরি)'],
                ['blocked', 'Blocked (আটকে)'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm({ ...form, project_health: value })}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  form.project_health === value
                    ? healthClass(value)
                    : 'border-[#2a3548] text-slate-400 hover:border-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-[10px] uppercase text-slate-500">
            Backend / agent process notes (optional)
          </span>
          <textarea
            className="input-faos w-full min-h-[64px]"
            placeholder="What ran on Render / Next API / agents today…"
            value={form.backend_notes}
            onChange={(e) => setForm({ ...form, backend_notes: e.target.value })}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading}
            className="btn-faos-primary"
          >
            {loading ? 'Saving…' : 'Submit daily log · লগ জমা দিন'}
          </button>
          {msg && <MsgBanner msg={msg} error={/fail|error|required|নাম/i.test(msg)} />}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white">
          Day board · {filterDate}
        </h2>
        {logs.length === 0 && (
          <p className="text-sm text-slate-500">
            No logs for this date yet. Submit the form above.
          </p>
        )}
        {logs.map((log) => (
          <article
            key={log.id}
            className="rounded-xl border border-[#2a3548] bg-[#111827] p-4 space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {log.member_name}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {log.member_role}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {log.log_date}
                  {log.submitted_by ? ` · via ${log.submitted_by}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-md border px-2 py-1 text-[10px] font-medium ${healthClass(
                    log.project_health
                  )}`}
                >
                  {healthLabel(log.project_health)}
                </span>
                <button
                  type="button"
                  onClick={() => void remove(log.id)}
                  className="text-[10px] text-slate-500 hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[10px] uppercase text-slate-500 mb-1">Completed</p>
                <ul className="space-y-1 text-slate-300">
                  {log.tasks_completed.length === 0 && (
                    <li className="text-slate-600">—</li>
                  )}
                  {log.tasks_completed.map((t) => (
                    <li key={t}>• {t}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500 mb-1">In progress</p>
                <ul className="space-y-1 text-slate-300">
                  {log.tasks_in_progress.length === 0 && (
                    <li className="text-slate-600">—</li>
                  )}
                  {log.tasks_in_progress.map((t) => (
                    <li key={t.name} className="flex justify-between gap-2">
                      <span>• {t.name}</span>
                      <span className="text-[#00f5d4] shrink-0">{t.progress_pct}%</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500 mb-1">Blockers</p>
                <ul className="space-y-1 text-slate-300">
                  {log.blockers.length === 0 && (
                    <li className="text-slate-600">None</li>
                  )}
                  {log.blockers.map((t) => (
                    <li key={t} className="text-amber-200/90">
                      • {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500 mb-1">Next day</p>
                <ul className="space-y-1 text-slate-300">
                  {log.next_day_plan.length === 0 && (
                    <li className="text-slate-600">—</li>
                  )}
                  {log.next_day_plan.map((t) => (
                    <li key={t}>• {t}</li>
                  ))}
                </ul>
              </div>
            </div>
            {log.backend_notes && (
              <p className="text-xs text-slate-400 border-t border-[#2a3548] pt-2">
                Backend: {log.backend_notes}
              </p>
            )}
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[#00f5d4]">
            Agent / backend process feed
          </h2>
          <span className="text-[10px] text-slate-500 uppercase">
            Live workflow tasks
          </span>
        </div>
        {agentActivity.length === 0 && (
          <p className="text-sm text-slate-500">
            No agent tasks in memory yet. Assign work from Projects / Agents to
            see pipeline status here.
          </p>
        )}
        <ul className="space-y-2">
          {agentActivity.map((task) => (
            <li
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1e293b] px-3 py-2 text-xs"
            >
              <div className="min-w-0">
                <p className="text-slate-200 truncate">
                  <span className="text-slate-500">{task.agent_id}</span>
                  {' · '}
                  {task.command}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {task.route_label || task.task_type || 'general'}
                  {task.result_summary ? ` · ${task.result_summary}` : ''}
                </p>
              </div>
              <span className={`uppercase text-[10px] font-semibold ${taskStatusClass(task.status)}`}>
                {task.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
