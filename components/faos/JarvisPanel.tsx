'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { matchShellAgents } from '@/lib/shell-agents';
import { routeQuery } from '@/lib/ai-router';
import { VoiceButton } from '@/components/faos/VoiceButton';
import { ChatHistorySidebar } from '@/components/faos/ChatHistorySidebar';
import {
  loadTtsPreferences,
  saveTtsPreferences,
  speakIfEnabled,
  stopSpeaking,
  type TtsPreferences,
} from '@/lib/tts';
import {
  ATTACHMENT_LIMITS,
  attachmentsToApiPayload,
  fileToAttachment,
  isAllowedFile,
  revokeAttachmentPreview,
  type PromptAttachment,
} from '@/lib/attachments';

type JarvisEntry = {
  role: 'user' | 'jarvis' | 'system';
  text: string;
  meta?: string;
};

type JarvisPanelProps = {
  compact?: boolean;
  /** Show Gemini-style history sidebar (full page /jarvis). Super Admin only. */
  showHistory?: boolean;
};

const BOOT_MESSAGE: JarvisEntry = {
  role: 'system',
  text: 'JARVIS online — shell agents ready. Speak or type any command. History auto-saves for Super Admin.',
};

export function JarvisPanel({ compact = false, showHistory = false }: JarvisPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [canSeeHistory, setCanSeeHistory] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [tts, setTts] = useState<TtsPreferences>({
    enabled: true,
    langMode: 'auto',
    rate: 1.05,
  });
  const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
  const [history, setHistory] = useState<JarvisEntry[]>([BOOT_MESSAGE]);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTts(loadTtsPreferences());
  }, []);

  // Hydrate active session on mount (Super Admin) — survives browser refresh
  useEffect(() => {
    if (!showHistory) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/jarvis/sessions?active=1', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (res.status === 403) {
          if (!cancelled) setCanSeeHistory(false);
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as {
          session?: {
            id: string;
            messages: Array<{ role: string; text: string; meta?: string }>;
          };
        };
        if (cancelled || !data.session) return;
        setCanSeeHistory(true);
        setSessionId(data.session.id);
        const msgs = data.session.messages
          .filter((m) => m.role === 'user' || m.role === 'jarvis' || m.role === 'system')
          .map((m) => ({
            role: m.role as JarvisEntry['role'],
            text: m.text,
            meta: m.meta,
          }));
        if (msgs.length) setHistory(msgs);
      } catch {
        /* offline — keep local boot message */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showHistory]);

  const preview = input.trim() ? routeQuery(input.trim(), true) : null;
  const agentPreview = input.trim() ? matchShellAgents(input.trim(), 2) : [];

  const setVoiceReply = (enabled: boolean) => {
    setTts((prev) => {
      const next = { ...prev, enabled };
      saveTtsPreferences(next);
      if (!enabled) stopSpeaking();
      return next;
    });
  };

  const loadSession = async (id: string) => {
    const res = await fetch(`/api/jarvis/sessions?id=${encodeURIComponent(id)}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return;
    await fetch('/api/jarvis/sessions', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'activate', session_id: id }),
    });
    const data = (await res.json()) as {
      session?: { id: string; messages: Array<{ role: string; text: string; meta?: string }> };
    };
    if (!data.session) return;
    setSessionId(data.session.id);
    setHistory(
      data.session.messages
        .filter((m) => m.role === 'user' || m.role === 'jarvis' || m.role === 'system')
        .map((m) => ({
          role: m.role as JarvisEntry['role'],
          text: m.text,
          meta: m.meta,
        }))
    );
  };

  const startNewSession = async () => {
    const res = await fetch('/api/jarvis/sessions', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', source: 'jarvis' }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      session?: { id: string; messages: Array<{ role: string; text: string; meta?: string }> };
    };
    if (!data.session) return;
    setSessionId(data.session.id);
    setHistory(
      data.session.messages.map((m) => ({
        role: m.role as JarvisEntry['role'],
        text: m.text,
        meta: m.meta,
      }))
    );
    setHistoryRefresh((n) => n + 1);
  };

  const send = useCallback(
    async (text: string, fromVoice = false) => {
      const q = text.trim();
      if ((!q && attachments.length === 0) || loading) return;
      setLoading(true);
      setOpen(true);
      setHistory((h) => [
        ...h,
        {
          role: 'user',
          text: q || `[${attachments.length} attachment(s)]`,
          meta: fromVoice ? 'voice' : attachments.length ? 'multimodal' : undefined,
        },
      ]);
      setInput('');

      const packed = attachmentsToApiPayload(attachments);
      attachments.forEach(revokeAttachmentPreview);
      setAttachments([]);

      try {
        const res = await fetch('/api/jarvis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            command: q || 'Analyze attached media for executive briefing.',
            voice: fromVoice,
            attachments: packed,
            tts_requested: tts.enabled,
            session_id: sessionId || undefined,
          }),
        });
        const data = (await res.json()) as {
          reply?: string;
          error?: string;
          session_id?: string;
          primary_agent?: { icon?: string; name?: string };
          agents_dispatched?: string[];
          route_label?: string;
          action_taken?: string;
          attachments_received?: number;
          usage?: { total_tokens?: number };
        };
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

        if (data.session_id) {
          setSessionId(data.session_id);
          setHistoryRefresh((n) => n + 1);
        }

        const meta = [
          data.primary_agent ? `${data.primary_agent.icon} ${data.primary_agent.name}` : '',
          data.route_label,
          data.action_taken,
          data.agents_dispatched?.length ? `${data.agents_dispatched.length} agents` : '',
          data.attachments_received != null ? `${data.attachments_received} files` : '',
          data.usage?.total_tokens != null ? `${data.usage.total_tokens} tok` : '',
        ]
          .filter(Boolean)
          .join(' · ');

        const reply = data.reply || '(empty)';
        setHistory((h) => [...h, { role: 'jarvis', text: reply, meta }]);
        speakIfEnabled(reply, tts);
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
    [attachments, loading, tts, sessionId]
  );

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = ATTACHMENT_LIMITS.maxFiles - attachments.length;
    const next: PromptAttachment[] = [];
    for (const file of Array.from(files).slice(0, Math.max(0, remaining))) {
      if (!isAllowedFile(file)) continue;
      next.push(await fileToAttachment(file));
    }
    if (next.length) setAttachments((a) => [...a, ...next]);
  };

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

  const panel = (
    <div className={`flex ${showHistory && canSeeHistory ? 'flex-col sm:flex-row' : 'flex-col'} min-h-0`}>
      {showHistory && canSeeHistory && (
        <ChatHistorySidebar
          activeSessionId={sessionId}
          onSelectSession={(id) => void loadSession(id)}
          onNewSession={() => void startNewSession()}
          refreshKey={historyRefresh}
        />
      )}
      <div className="flex-1 min-w-0">
        <JarvisPanelInner
          input={input}
          setInput={setInput}
          inputRef={inputRef}
          fileRef={fileRef}
          loading={loading}
          history={history}
          preview={preview}
          agentPreview={agentPreview}
          voiceReply={tts.enabled}
          setVoiceReply={setVoiceReply}
          attachments={attachments}
          onRemoveAttachment={(id) =>
            setAttachments((list) => {
              const t = list.find((a) => a.id === id);
              if (t) revokeAttachmentPreview(t);
              return list.filter((a) => a.id !== id);
            })
          }
          onPickFiles={(f) => void addFiles(f)}
          onSend={send}
          onClose={compact ? () => setOpen(false) : undefined}
        />
      </div>
    </div>
  );

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 h-8 px-2 rounded-md bg-[#00f5d4]/10 text-[#00f5d4] text-[10px] font-bold border border-[#00f5d4]/30 hover:bg-[#00f5d4]/20 touch-manipulation"
          title="JARVIS (⌘⇧J)"
        >
          JARVIS
        </button>

        {open && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60">
            <div
              ref={panelRef}
              className="w-full max-w-3xl max-h-[90dvh] rounded-2xl border border-[#00f5d4]/30 bg-[#0c1222] shadow-2xl overflow-hidden"
            >
              {panel}
            </div>
          </div>
        )}
      </>
    );
  }

  return panel;
}

type InnerProps = {
  input: string;
  setInput: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  fileRef: React.RefObject<HTMLInputElement | null>;
  loading: boolean;
  history: JarvisEntry[];
  preview: ReturnType<typeof routeQuery> | null;
  agentPreview: ReturnType<typeof matchShellAgents>;
  voiceReply: boolean;
  setVoiceReply: (v: boolean) => void;
  attachments: PromptAttachment[];
  onRemoveAttachment: (id: string) => void;
  onPickFiles: (files: FileList | null) => void;
  onSend: (text: string, fromVoice?: boolean) => Promise<void>;
  onClose?: () => void;
};

function JarvisPanelInner({
  input,
  setInput,
  inputRef,
  fileRef,
  loading,
  history,
  preview,
  agentPreview,
  voiceReply,
  setVoiceReply,
  attachments,
  onRemoveAttachment,
  onPickFiles,
  onSend,
  onClose,
}: InnerProps) {
  return (
    <div className="flex flex-col max-h-[80vh] sm:max-h-[80vh]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3548] bg-[#111827]">
        <div>
          <p className="text-sm font-bold text-[#00f5d4]">JARVIS v5.3</p>
          <p className="text-[10px] text-slate-500">agents · voice-to-voice · multimodal · persistent</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-lg touch-manipulation">
            ×
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[160px] max-h-64">
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

      {attachments.length > 0 && (
        <div className="px-3 py-2 border-t border-[#2a3548] flex gap-2 overflow-x-auto">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="relative shrink-0 w-14 h-14 rounded-md border border-[#334155] overflow-hidden bg-[#0c1222]"
            >
              {a.kind === 'image' && a.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.previewUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-400">
                  {a.kind.toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => onRemoveAttachment(a.id)}
                className="absolute top-0 right-0 w-4 h-4 bg-black/70 text-[9px] text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {preview && input.trim() && (
        <div className="px-4 py-1 text-[9px] text-emerald-400/80 border-t border-[#2a3548]/50">
          {preview.label}
          {agentPreview.length > 0 &&
            ` · ${agentPreview.map((a) => a.icon).join(' ')} ${agentPreview.map((a) => a.name).join(', ')}`}
        </div>
      )}

      <div className="p-3 border-t border-[#2a3548] flex gap-2 items-center">
        <VoiceButton onTranscript={(t) => void onSend(t, true)} disabled={loading} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading || attachments.length >= ATTACHMENT_LIMITS.maxFiles}
          className="shrink-0 h-9 w-9 rounded-md border border-[#2a3548] text-sm disabled:opacity-40 touch-manipulation"
          title="Attach files"
        >
          📎
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf,audio/*"
          multiple
          className="hidden"
          onChange={(e) => onPickFiles(e.target.files)}
        />
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
          disabled={loading || (!input.trim() && attachments.length === 0)}
          className="btn-faos-primary h-9 px-4 text-xs touch-manipulation"
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
        TTS — auto-read every JARVIS reply (BN/EN)
      </label>
    </div>
  );
}
