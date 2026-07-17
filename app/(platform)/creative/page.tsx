'use client';

import { useMemo, useState } from 'react';
import { routeQuery } from '@/lib/ai-router';

const PRESETS = [
  {
    label: 'Social banner',
    command: 'Design Instagram banner for FMK WIG summer sale — teal brand, bold headline, CTA',
  },
  {
    label: 'Logo concept',
    command: 'Create 3 logo concepts for MK Kitchen Cloud Food — modern, appetizing, minimal',
  },
  {
    label: 'Video reel script',
    command: 'Write 30-second TikTok reel script for FMK Shoes new sneaker drop with hook and captions',
  },
  {
    label: 'Edit plan',
    command: 'Video edit plan: 60s product demo for prosthetic hair system — scenes, transitions, B-roll list',
  },
];

export default function CreativeStudioPage() {
  const [brief, setBrief] = useState('');
  const [result, setResult] = useState('');
  const [meta, setMeta] = useState('');
  const [loading, setLoading] = useState(false);

  const preview = useMemo(
    () => (brief.trim() ? routeQuery(brief.trim(), true) : null),
    [brief]
  );

  const run = async () => {
    const q = brief.trim();
    if (!q || loading) return;
    setLoading(true);
    setResult('');
    setMeta('');
    try {
      const res = await fetch('/api/agent-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: q,
          auto_execute: true,
          task_type: preview?.taskType || 'creative',
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        route?: { label?: string; model?: string; task_type?: string };
        tasks?: Array<{ deliverable?: string; result_summary?: string; route_label?: string }>;
        message?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Failed');

      const task = data.tasks?.[0];
      setResult(task?.deliverable || task?.result_summary || data.message || 'Queued');
      setMeta(
        [data.route?.label, data.route?.task_type, task?.route_label].filter(Boolean).join(' · ')
      );
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Creative & Video Studio</h1>
        <p className="text-sm text-slate-400 mt-1">
          One command — FAOS picks the best AI (Claude for design copy, Gemini for video scripts).
          Deliverable in token-saving mode.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setBrief(p.command)}
            className="text-xs px-3 py-1.5 rounded-full border border-[#2a3548] text-slate-400 hover:border-[#00f5d4]/40 hover:text-[#00f5d4]"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-4">
        <textarea
          className="input-faos min-h-[140px]"
          placeholder="Describe graphics, brand assets, video edit, reel script…"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
        />
        {preview && (
          <p className="text-[11px] text-emerald-400/80">
            Auto-route: {preview.label} — {preview.reason}
          </p>
        )}
        <button type="button" onClick={() => void run()} disabled={loading} className="btn-faos-primary">
          {loading ? 'Delivering…' : 'Deliver via best AI agent'}
        </button>
      </div>

      {result && (
        <div className="rounded-xl border border-[#2a3548] bg-[#0c1222] p-5">
          {meta && <p className="text-[10px] text-slate-500 mb-3">{meta}</p>}
          <pre className="whitespace-pre-wrap text-sm text-slate-200 font-sans">{result}</pre>
        </div>
      )}
    </div>
  );
}
