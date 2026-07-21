'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { routeQuery } from '@/lib/ai-router';
import { VoiceButton } from '@/components/faos/VoiceButton';
import {
  loadTtsPreferences,
  saveTtsPreferences,
  speakIfEnabled,
  stopSpeaking,
  type TtsLangMode,
  type TtsPreferences,
} from '@/lib/tts';
import {
  ATTACHMENT_LIMITS,
  attachmentsToApiPayload,
  fileToAttachment,
  isAllowedFile,
  revokeAttachmentPreview,
  videoLinkAttachment,
  type PromptAttachment,
} from '@/lib/attachments';

type ChatEntry = {
  role: 'user' | 'assistant' | 'system';
  text: string;
  meta?: string;
};

type ChatConsoleProps = {
  /** jarvis = /api/jarvis · chat = /api/chat */
  endpoint?: 'jarvis' | 'chat';
  title?: string;
  subtitle?: string;
};

export function ChatConsole({
  endpoint = 'chat',
  title = 'Workstation Command Console',
  subtitle = 'Voice-to-voice · multimodal attachments · token-saving gateway',
}: ChatConsoleProps) {
  const [input, setInput] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tts, setTts] = useState<TtsPreferences>(() => ({
    enabled: true,
    langMode: 'auto',
    rate: 1.05,
  }));
  const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<ChatEntry[]>([
    {
      role: 'system',
      text: 'FAOS gateway online. TTS reads replies aloud when enabled. Attach images, PDFs, audio, or video links.',
    },
  ]);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTts(loadTtsPreferences());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  useEffect(() => {
    return () => {
      attachments.forEach(revokeAttachmentPreview);
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount only
  }, []);

  const updateTts = (patch: Partial<TtsPreferences>) => {
    setTts((prev) => {
      const next = { ...prev, ...patch };
      saveTtsPreferences(next);
      return next;
    });
  };

  const preview = input.trim() ? routeQuery(input.trim(), true) : null;

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');
    const remaining = ATTACHMENT_LIMITS.maxFiles - attachments.length;
    if (remaining <= 0) {
      setError(`Max ${ATTACHMENT_LIMITS.maxFiles} attachments.`);
      return;
    }
    const next: PromptAttachment[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!isAllowedFile(file)) {
        setError(`${file.name}: type/size not allowed (≤2MB image/PDF/audio).`);
        continue;
      }
      next.push(await fileToAttachment(file));
    }
    if (next.length) setAttachments((a) => [...a, ...next]);
  };

  const addVideoLink = () => {
    const att = videoLinkAttachment(linkInput);
    if (!att) {
      setError('Enter a valid http(s) video / media URL.');
      return;
    }
    if (attachments.length >= ATTACHMENT_LIMITS.maxFiles) {
      setError(`Max ${ATTACHMENT_LIMITS.maxFiles} attachments.`);
      return;
    }
    setAttachments((a) => [...a, att]);
    setLinkInput('');
    setError('');
  };

  const removeAttachment = (id: string) => {
    setAttachments((list) => {
      const target = list.find((a) => a.id === id);
      if (target) revokeAttachmentPreview(target);
      return list.filter((a) => a.id !== id);
    });
  };

  const send = useCallback(
    async (text: string, fromVoice = false) => {
      const q = text.trim();
      if ((!q && attachments.length === 0) || loading) return;
      setLoading(true);
      setError('');

      const display = q || `[${attachments.length} attachment(s)]`;
      setHistory((h) => [
        ...h,
        { role: 'user', text: display, meta: fromVoice ? 'voice' : attachments.length ? 'multimodal' : undefined },
      ]);
      setInput('');

      const payloadAttachments = attachmentsToApiPayload(attachments);
      // Clear previews after packing payload
      attachments.forEach(revokeAttachmentPreview);
      setAttachments([]);

      try {
        const url = endpoint === 'jarvis' ? '/api/jarvis' : '/api/chat';
        const body =
          endpoint === 'jarvis'
            ? {
                command: q || 'Analyze the attached files for FAOS executive briefing.',
                voice: fromVoice,
                attachments: payloadAttachments,
                tts_requested: tts.enabled,
              }
            : {
                message: q || 'Analyze the attached files for FAOS executive briefing.',
                attachments: payloadAttachments,
                tts_requested: tts.enabled,
              };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as {
          reply?: string;
          error?: string;
          route_label?: string;
          intent?: string;
          provider?: string;
          primary_agent?: { icon?: string; name?: string };
          action_taken?: string;
          attachments_received?: number;
          usage?: { total_tokens?: number };
        };
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

        const reply = data.reply || '(empty)';
        const meta = [
          data.primary_agent ? `${data.primary_agent.icon} ${data.primary_agent.name}` : data.route_label,
          data.action_taken,
          data.intent,
          data.attachments_received != null ? `${data.attachments_received} files` : '',
          data.usage?.total_tokens != null ? `${data.usage.total_tokens} tok` : '',
        ]
          .filter(Boolean)
          .join(' · ');

        setHistory((h) => [...h, { role: 'assistant', text: reply, meta }]);
        speakIfEnabled(reply, tts);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Request failed';
        setHistory((h) => [...h, { role: 'assistant', text: msg, meta: 'error' }]);
      } finally {
        setLoading(false);
      }
    },
    [attachments, endpoint, loading, tts]
  );

  return (
    <div className="flex flex-col rounded-2xl border border-[#2a3548] bg-[#111827] overflow-hidden min-h-[420px] max-h-[min(80vh,720px)]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[#2a3548] bg-[#0c1222]">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">{title}</p>
          <p className="text-[10px] text-slate-500 truncate">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={tts.enabled}
              onChange={(e) => {
                if (!e.target.checked) stopSpeaking();
                updateTts({ enabled: e.target.checked });
              }}
              className="accent-[#00f5d4]"
            />
            TTS
          </label>
          <select
            value={tts.langMode}
            onChange={(e) => updateTts({ langMode: e.target.value as TtsLangMode })}
            className="h-8 rounded-md bg-[#0c1222] border border-[#2a3548] text-[10px] text-slate-300 px-2"
            title="Speech language"
          >
            <option value="auto">Auto BN/EN</option>
            <option value="bn">বাংলা</option>
            <option value="en">English</option>
          </select>
          <button
            type="button"
            onClick={() => stopSpeaking()}
            className="h-8 px-2 rounded-md text-[10px] text-slate-400 border border-[#2a3548] hover:text-white"
          >
            Stop
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
        {history.map((entry, i) => (
          <div
            key={`${i}-${entry.text.slice(0, 12)}`}
            className={
              entry.role === 'user'
                ? 'text-[#00bbf9]'
                : entry.role === 'assistant'
                  ? 'text-slate-200'
                  : 'text-slate-500'
            }
          >
            {entry.role === 'user' && <span className="text-slate-500">You › </span>}
            {entry.role === 'assistant' && <span className="text-[#00f5d4]">FAOS › </span>}
            <span className="whitespace-pre-wrap">{entry.text}</span>
            {entry.meta && <p className="text-[9px] text-slate-600 mt-1">{entry.meta}</p>}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {attachments.length > 0 && (
        <div className="px-3 py-2 border-t border-[#2a3548] flex gap-2 overflow-x-auto">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="relative shrink-0 w-16 h-16 rounded-lg border border-[#334155] bg-[#0c1222] overflow-hidden"
              title={a.name}
            >
              {a.kind === 'image' && a.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.previewUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[9px] text-slate-400 p-1 text-center">
                  <span>{a.kind === 'pdf' ? 'PDF' : a.kind === 'audio' ? '♪' : a.kind === 'video_link' ? '▶' : 'FILE'}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(a.id)}
                className="absolute top-0 right-0 w-5 h-5 bg-black/70 text-white text-[10px]"
                aria-label="Remove attachment"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {preview && input.trim() && (
        <p className="px-4 py-1 text-[9px] text-emerald-400/80 border-t border-[#2a3548]/40">
          → {preview.label}
        </p>
      )}

      <div className="p-3 border-t border-[#2a3548] space-y-2">
        <div className="flex gap-2 items-center">
          <VoiceButton onTranscript={(t) => void send(t, true)} disabled={loading} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading || attachments.length >= ATTACHMENT_LIMITS.maxFiles}
            className="shrink-0 h-9 w-9 rounded-md border border-[#2a3548] text-slate-300 hover:border-[#00f5d4]/40 text-sm disabled:opacity-40"
            title="Attach image / PDF / audio"
          >
            📎
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf,audio/*"
            multiple
            className="hidden"
            onChange={(e) => void addFiles(e.target.files)}
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={2}
            placeholder="Ask in English or বাংলা… Shift+Enter for newline"
            className="input-faos flex-1 text-xs min-h-[44px] resize-none"
          />
          <button
            type="button"
            onClick={() => void send(input)}
            disabled={loading || (!input.trim() && attachments.length === 0)}
            className="btn-faos-primary h-9 px-4 text-xs shrink-0"
          >
            {loading ? '…' : 'Send'}
          </button>
        </div>

        <div className="flex gap-2">
          <input
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="Paste video / media URL"
            className="input-faos flex-1 h-8 text-[11px]"
          />
          <button
            type="button"
            onClick={addVideoLink}
            className="h-8 px-3 rounded-md border border-[#2a3548] text-[10px] text-slate-300 hover:text-white"
          >
            Add link
          </button>
        </div>
        {error && <p className="text-[10px] text-red-400">{error}</p>}
      </div>
    </div>
  );
}
