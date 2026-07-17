'use client';

import { useMemo, useState } from 'react';
import { routeQuery } from '@/lib/ai-router';

export default function OperationsPage() {
  const [cmdInput, setCmdInput] = useState('');
  const [cmdLog, setCmdLog] = useState<string[]>([
    '[FAOS] Unified AI Gateway — Claude / GPT / Gemini auto-routed · token-saving ON.',
  ]);
  const [loading, setLoading] = useState(false);

  const preview = useMemo(
    () => (cmdInput.trim() ? routeQuery(cmdInput.trim(), true) : null),
    [cmdInput]
  );

  const run = async () => {
    const q = cmdInput.trim();
    if (!q || loading) return;
    setLoading(true);
    setCmdLog((p) => [...p, `CEO> ${q}`]);
    setCmdInput('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        route_label?: string;
        intent?: string;
        provider?: string;
        usage?: { total_tokens?: number };
      };
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setCmdLog((p) =>
        [
          ...p,
          `[${data.route_label || data.provider}] ${data.reply}`,
          data.usage?.total_tokens != null
            ? `[${data.intent} · ${data.usage.total_tokens} tokens]`
            : `[${data.intent}]`,
        ].filter(Boolean)
      );
    } catch (e) {
      setCmdLog((p) => [...p, `[ERROR] ${e instanceof Error ? e.message : 'failed'}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-white">Command Center</h1>
      <p className="text-sm text-slate-400">
        Ask anything — FAOS routes to the best model. Keys stay server-side · lean token mode.
      </p>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-4 text-xs text-slate-400 grid sm:grid-cols-2 gap-2">
        <span>Strategy → Claude Sonnet</span>
        <span>Code → GPT-4o</span>
        <span>Creative → Claude Sonnet</span>
        <span>Video → Gemini Flash</span>
        <span>Analysis → GPT-4o Mini</span>
        <span>বাংলা / Chat → Gemini Flash</span>
      </div>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-4 h-64 overflow-y-auto font-mono text-xs space-y-2 text-slate-300">
        {cmdLog.map((line, i) => (
          <div key={`${i}-${line.slice(0, 12)}`}>{line}</div>
        ))}
      </div>
      <div className="flex gap-2 flex-col sm:flex-row">
        <input
          value={cmdInput}
          onChange={(e) => setCmdInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void run()}
          placeholder="Ask in English or বাংলা…"
          className="input-faos flex-1 font-mono"
        />
        <button type="button" onClick={() => void run()} disabled={loading} className="btn-faos-primary px-6">
          {loading ? '…' : 'Ask AI'}
        </button>
      </div>
      {preview && cmdInput.trim() && (
        <p className="text-[11px] text-emerald-400/70">Will route to: {preview.label}</p>
      )}
    </div>
  );
}
