'use client';

import { useCallback, useEffect, useState } from 'react';

export type ChatSessionSummary = {
  id: string;
  title: string;
  source: string;
  is_active: boolean;
  username: string;
  user_name: string;
  message_count: number;
  created_at: string;
  updated_at: string;
};

type ChatHistorySidebarProps = {
  activeSessionId?: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  refreshKey?: number;
};

export function ChatHistorySidebar({
  activeSessionId,
  onSelectSession,
  onNewSession,
  refreshKey = 0,
}: ChatHistorySidebarProps) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/jarvis/sessions', { credentials: 'include', cache: 'no-store' });
      const data = (await res.json()) as {
        sessions?: ChatSessionSummary[];
        error?: string;
        code?: string;
      };
      if (res.status === 403) {
        setDenied(true);
        setSessions([]);
        return;
      }
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      setDenied(false);
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (denied) {
    return (
      <aside className="w-full sm:w-56 shrink-0 border-r border-[#1e293b] bg-[#0a0f1c] p-3 text-[11px] text-slate-500">
        <p className="font-semibold text-slate-400 mb-1">Chat history</p>
        <p>Internal JARVIS logs are Super Admin only.</p>
      </aside>
    );
  }

  return (
    <aside className="w-full sm:w-60 shrink-0 border-r border-[#1e293b] bg-[#0a0f1c] flex flex-col max-h-[80vh]">
      <div className="p-3 border-b border-[#1e293b] flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold text-[#00f5d4] uppercase tracking-wider">History</p>
          <p className="text-[9px] text-slate-500">Super Admin · auto-saved</p>
        </div>
        <button
          type="button"
          onClick={onNewSession}
          className="text-[10px] font-bold bg-[#00f5d4]/15 text-[#00f5d4] border border-[#00f5d4]/30 px-2 py-1 rounded-md hover:bg-[#00f5d4]/25"
        >
          + New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && <p className="text-[10px] text-slate-500 px-2">Loading…</p>}
        {error && <p className="text-[10px] text-red-400 px-2">{error}</p>}
        {!loading && sessions.length === 0 && (
          <p className="text-[10px] text-slate-500 px-2">No saved conversations yet.</p>
        )}
        {sessions.map((s) => {
          const active = s.id === activeSessionId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSession(s.id)}
              className={`w-full text-left rounded-lg px-2.5 py-2 transition ${
                active
                  ? 'bg-[#00f5d4]/15 border border-[#00f5d4]/40'
                  : 'hover:bg-[#111827] border border-transparent'
              }`}
            >
              <p className="text-[11px] font-medium text-slate-200 line-clamp-2">{s.title}</p>
              <p className="text-[9px] text-slate-500 mt-1">
                {s.message_count} msgs · {new Date(s.updated_at).toLocaleDateString()}
              </p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
