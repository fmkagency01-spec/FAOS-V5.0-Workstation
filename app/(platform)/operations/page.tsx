'use client';

import { useState } from 'react';

export default function OperationsPage() {
  const [cmdInput, setCmdInput] = useState('');
  const [cmdLog, setCmdLog] = useState<string[]>(['[FAOS] Secure command center — token-saving mode active.']);
  const [loading, setLoading] = useState(false);

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
      const data = (await res.json()) as { reply?: string; error?: string; model?: string; usage?: { total_tokens?: number } };
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setCmdLog((p) => [
        ...p,
        `[${data.model}] ${data.reply}`,
        data.usage?.total_tokens != null ? `[tokens: ${data.usage.total_tokens}]` : '',
      ].filter(Boolean));
    } catch (e) {
      setCmdLog((p) => [...p, `[ERROR] ${e instanceof Error ? e.message : 'failed'}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-white">Command Center</h1>
      <p className="text-sm text-slate-400">Secure OpenRouter proxy · keys never in browser · lean token mode.</p>
      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-4 h-64 overflow-y-auto font-mono text-xs space-y-2 text-slate-300">
        {cmdLog.map((line, i) => (
          <div key={`${i}-${line.slice(0, 12)}`}>{line}</div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={cmdInput}
          onChange={(e) => setCmdInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void run()}
          placeholder="Strategy command…"
          className="input-faos flex-1 font-mono"
        />
        <button type="button" onClick={() => void run()} disabled={loading} className="btn-faos-primary px-6">
          {loading ? '…' : 'Run'}
        </button>
      </div>
    </div>
  );
}
