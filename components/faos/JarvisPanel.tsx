'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { matchShellAgents } from '@/lib/shell-agents';
import { routeQuery } from '@/lib/ai-router';
import { VoiceButton, speakText } from '@/components/faos/VoiceButton';

type JarvisEntry = {
  role: 'user' | 'jarvis' | 'system';
  text: string;
  meta?: string;
};

type JarvisPanelProps = {
  compact?: boolean;
};

export function JarvisPanel({ compact = false }: JarvisPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceReply, setVoiceReply] = useState(true);
  const [history, setHistory] = useState<JarvisEntry[]>([
    {
      role: 'system',
      text: 'JARVIS online — 25 shell agents ready. Speak or type any command.',
    },
  ]);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const preview = input.trim() ? routeQuery(input.trim(), true) : null;
  const agentPreview = input.trim() ? matchShellAgents(input.trim(), 2) : [];

  const send = useCallback(
    async (text: string, fromVoice = false) => {
      const q = text.trim();
      if (!q || loading) return;
      setLoading(true);
      setOpen(true);
      setHistory((h) => [...h, { role: 'user', text: q, meta: fromVoice ? 'voice' : undefined }]);
      setInput('');

      try {
        const res = await fetch('/api/jarvis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: q, voice: fromVoice }),
        });
        const data = (await res.json()) as {
          reply?: string;
          error?: string;
          primary_agent?: { icon?: string; name?: string };
          agents_dispatched?: string[];
          route_label?: string;
          action_taken?: string;
          usage?: { total_tokens?: number };
        };
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

        const meta = [
          data.primary_agent ? `${data.primary_agent.icon} ${data.primary_agent.name}` : '',
          data.route_label,
          data.action_taken,
          data.agents_dispatched?.length ? `${data.agents_dispatched.length} agents` : '',
          data.usage?.total_tokens != null ? `${data.usage.total_tokens} tok` : '',
        ]
          .filter(Boolean)
          .join(' · ');

        const reply = data.reply || '(empty)';
        setHistory((h) => [...h, { role: 'jarvis', text: reply, meta }]);

        if (voiceReply && fromVoice) {
          speakText(reply);
        }
      } catch (e) {
        setHistory((h) => [
          ...h,
          {
            role: 'jarvis',
            text: e instanceof Error ? e.message : 'JARVIS unavailable',
            meta: 'error',
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, voiceReply]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setOpen((v) => !v);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 h-8 px-2 rounded-md bg-[#00f5d4]/10 text-[#00f5d4] text-[10px] font-bold border border-[#00f5d4]/30 hover:bg-[#00f5d4]/20"
          title="JARVIS (⌘⇧J)"
        >
          JARVIS
        </button>

        {open && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60">
            <div
              ref={panelRef}
              className="w-full max-w-lg rounded-2xl border border-[#00f5d4]/30 bg-[#0c1222] shadow-2xl overflow-hidden"
            >
              <JarvisPanelInner
                input={input}
                setInput={setInput}
                inputRef={inputRef}
                loading={loading}
                history={history}
                preview={preview}
                agentPreview={agentPreview}
                voiceReply={voiceReply}
                setVoiceReply={setVoiceReply}
                onSend={send}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <JarvisPanelInner
      input={input}
      setInput={setInput}
      inputRef={inputRef}
      loading={loading}
      history={history}
      preview={preview}
      agentPreview={agentPreview}
      voiceReply={voiceReply}
      setVoiceReply={setVoiceReply}
      onSend={send}
    />
  );
}

type InnerProps = {
  input: string;
  setInput: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  loading: boolean;
  history: JarvisEntry[];
  preview: ReturnType<typeof routeQuery> | null;
  agentPreview: ReturnType<typeof matchShellAgents>;
  voiceReply: boolean;
  setVoiceReply: (v: boolean) => void;
  onSend: (text: string, fromVoice?: boolean) => Promise<void>;
  onClose?: () => void;
};

function JarvisPanelInner({
  input,
  setInput,
  inputRef,
  loading,
  history,
  preview,
  agentPreview,
  voiceReply,
  setVoiceReply,
  onSend,
  onClose,
}: InnerProps) {
  return (
    <div className="flex flex-col max-h-[80vh]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3548] bg-[#111827]">
        <div>
          <p className="text-sm font-bold text-[#00f5d4]">JARVIS v5.1</p>
          <p className="text-[10px] text-slate-500">25 shell agents · voice + chat</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-lg">
            ×
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-64">
        {history.map((entry, i) => (
          <div
            key={`${i}-${entry.text.slice(0, 12)}`}
            className={`text-xs ${
              entry.role === 'user'
                ? 'text-[#00bbf9]'
                : entry.role === 'jarvis'
                  ? 'text-slate-200'
                  : 'text-slate-500'
            }`}
          >
            {entry.role === 'user' && <span className="text-slate-500">You › </span>}
            {entry.role === 'jarvis' && <span className="text-[#00f5d4]">JARVIS › </span>}
            <span className="whitespace-pre-wrap">{entry.text}</span>
            {entry.meta && <p className="text-[9px] text-slate-600 mt-1">{entry.meta}</p>}
          </div>
        ))}
      </div>

      {preview && input.trim() && (
        <div className="px-4 py-1 text-[9px] text-emerald-400/80 border-t border-[#2a3548]/50">
          {preview.label}
          {agentPreview.length > 0 &&
            ` · ${agentPreview.map((a) => a.icon).join(' ')} ${agentPreview.map((a) => a.name).join(', ')}`}
        </div>
      )}

      <div className="p-3 border-t border-[#2a3548] flex gap-2 items-center">
        <VoiceButton onTranscript={(t) => void onSend(t, true)} disabled={loading} />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void onSend(input)}
          placeholder="Command JARVIS…"
          className="input-faos flex-1 h-9 text-xs"
        />
        <button
          type="button"
          onClick={() => void onSend(input)}
          disabled={loading || !input.trim()}
          className="btn-faos-primary h-9 px-4 text-xs"
        >
          {loading ? '…' : 'Go'}
        </button>
      </div>

      <label className="px-4 pb-3 flex items-center gap-2 text-[10px] text-slate-500 cursor-pointer">
        <input
          type="checkbox"
          checked={voiceReply}
          onChange={(e) => setVoiceReply(e.target.checked)}
          className="accent-[#00f5d4]"
        />
        Speak replies after voice commands
      </label>
    </div>
  );
}
