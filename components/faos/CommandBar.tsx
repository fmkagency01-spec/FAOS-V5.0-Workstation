'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { routeQuery } from '@/lib/ai-router';
import {
  loadJarvisSessionCache,
  saveJarvisSessionCache,
} from '@/lib/jarvis-session-cache';

type ChatEntry = {
  role: 'user' | 'assistant' | 'system';
  text: string;
  meta?: string;
};

type CommandBarProps = {
  /** Compact mode for top bar vs full panel */
  variant?: 'bar' | 'panel';
};

export function CommandBar({ variant = 'bar' }: CommandBarProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatEntry[]>([
    {
      role: 'system',
      text: 'JARVIS v6 Gateway + Hermes Co-Founder — ask anything. History auto-saves · TTS via JARVIS panel.',
    },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const preview = input.trim() ? routeQuery(input.trim(), true) : null;

  useEffect(() => {
    const cached = loadJarvisSessionCache();
    if (cached?.session_id) setSessionId(cached.session_id);
    if (cached?.messages?.length) {
      setHistory(
        cached.messages.map((m) => ({
          role: (m.role === 'jarvis' ? 'assistant' : m.role) as ChatEntry['role'],
          text: m.text,
          meta: m.meta,
        }))
      );
    }
    // Soft hydrate from server when Super Admin
    void (async () => {
      try {
        const res = await fetch('/api/jarvis/sessions?active=1', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          session?: {
            id: string;
            messages: Array<{ role: string; text: string; meta?: string }>;
          };
        };
        if (!data.session) return;
        setSessionId(data.session.id);
        const msgs = data.session.messages.map((m) => ({
          role: (m.role === 'jarvis' ? 'assistant' : m.role) as ChatEntry['role'],
          text: m.text,
          meta: m.meta,
        }));
        if (msgs.length) {
          setHistory(msgs);
          saveJarvisSessionCache({
            session_id: data.session.id,
            messages: msgs.map((m) => ({
              role: m.role === 'assistant' ? 'jarvis' : m.role,
              text: m.text,
              meta: m.meta,
            })),
          });
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;
    setLoading(true);
    setOpen(true);
    setHistory((h) => [...h, { role: 'user', text: q }]);
    setInput('');

    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ command: q, session_id: sessionId || undefined }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        model?: string;
        intent?: string;
        route_label?: string;
        primary_agent?: { icon?: string; name?: string };
        action_taken?: string;
        usage?: { total_tokens?: number };
        session_id?: string;
      };
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

      if (data.session_id) setSessionId(data.session_id);

      const meta = [
        data.primary_agent ? `${data.primary_agent.icon} ${data.primary_agent.name}` : data.route_label,
        data.action_taken,
        data.intent ? `intent: ${data.intent}` : '',
        data.usage?.total_tokens != null ? `${data.usage.total_tokens} tokens` : '',
      ]
        .filter(Boolean)
        .join(' · ');

      setHistory((h) => {
        const next = [...h, { role: 'assistant' as const, text: data.reply || '(empty)', meta }];
        const sid = data.session_id || sessionId;
        if (sid) {
          saveJarvisSessionCache({
            session_id: sid,
            messages: next.map((m) => ({
              role: m.role === 'assistant' ? 'jarvis' : m.role,
              text: m.text,
              meta: m.meta,
            })),
          });
        }
        return next;
      });
    } catch (e) {
      setHistory((h) => [
        ...h,
        {
          role: 'assistant',
          text: e instanceof Error ? e.message : 'Request failed',
          meta: 'error',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (open && panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-command-trigger]')) setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (variant === 'bar') {
    return (
      <div className="relative flex-1 max-w-xl" ref={panelRef}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            data-command-trigger
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void send();
            }}
            placeholder="Ask JARVIS — voice via 🧠 button (⌘K)"
            className="w-full h-8 px-3 rounded-md bg-[#0c1222] border border-[#2a3548] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#00f5d4]/50"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={loading || !input.trim()}
            className="hidden sm:inline-flex h-8 px-3 rounded-md bg-[#00f5d4]/15 text-[#00f5d4] text-[10px] font-bold border border-[#00f5d4]/30 hover:bg-[#00f5d4]/25 disabled:opacity-40"
          >
            {loading ? '…' : 'Ask'}
          </button>
        </div>

        {preview && input.trim() && (
          <p className="absolute left-0 top-full mt-0.5 text-[9px] text-slate-500 truncate max-w-full">
            → {preview.label}
          </p>
        )}

        {open && (
          <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-[#2a3548] bg-[#111827] shadow-2xl overflow-hidden">
            <div className="max-h-72 overflow-y-auto p-3 space-y-2 font-mono text-[11px]">
              {history.slice(-8).map((entry, i) => (
                <div
                  key={`${i}-${entry.text.slice(0, 16)}`}
                  className={
                    entry.role === 'user'
                      ? 'text-[#00f5d4]'
                      : entry.role === 'system'
                        ? 'text-slate-500'
                        : 'text-slate-300'
                  }
                >
                  {entry.role === 'user' && <span className="text-slate-500">You › </span>}
                  {entry.text}
                  {entry.meta && (
                    <span className="block text-[9px] text-slate-500 mt-0.5">{entry.meta}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-[#2a3548] px-3 py-2 flex justify-between text-[9px] text-slate-500">
              <span>Unified gateway · no separate AI tabs</span>
              <span>Esc to close</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
