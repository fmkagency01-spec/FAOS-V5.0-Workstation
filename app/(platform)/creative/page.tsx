'use client';

import { useMemo, useState } from 'react';
import { routeQuery } from '@/lib/ai-router';

const PRESETS = [
  {
    label: 'Social banner',
    command: 'Design Instagram banner for FMK WIG summer sale — teal brand, bold headline, CTA',
    mode: 'text' as const,
  },
  {
    label: 'Generate image',
    command: 'Professional product photo: FMK WIG prosthetic hair system on mannequin, studio lighting, teal accent',
    mode: 'image' as const,
  },
  {
    label: 'Video reel script',
    command: 'Write 30-second TikTok reel script for FMK Shoes new sneaker drop with hook and captions',
    mode: 'video' as const,
  },
  {
    label: 'Edit plan',
    command: 'Video edit plan: 60s product demo for prosthetic hair system — scenes, transitions, B-roll list',
    mode: 'video' as const,
  },
];

export default function CreativeStudioPage() {
  const [brief, setBrief] = useState('');
  const [result, setResult] = useState('');
  const [meta, setMeta] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'text' | 'image' | 'video'>('text');

  const preview = useMemo(
    () => (brief.trim() ? routeQuery(brief.trim(), true) : null),
    [brief]
  );

  const runText = async (q: string) => {
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
      route?: { label?: string; task_type?: string };
      tasks?: Array<{ deliverable?: string; result_summary?: string; route_label?: string }>;
      message?: string;
    };
    if (!res.ok) throw new Error(data.error || 'Failed');
    const task = data.tasks?.[0];
    setResult(task?.deliverable || task?.result_summary || data.message || 'Queued');
    setMeta([data.route?.label, data.route?.task_type, task?.route_label].filter(Boolean).join(' · '));
  };

  const runImage = async (q: string) => {
    const res = await fetch('/api/media/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: q }),
    });
    const data = (await res.json()) as {
      error?: string;
      image_url?: string;
      fallback_text?: string;
      enhanced_prompt?: string;
      model?: string;
      note?: string;
    };
    if (!res.ok) throw new Error(data.error || 'Failed');
    if (data.image_url) {
      setImageUrl(data.image_url);
      setResult(data.enhanced_prompt || q);
      setMeta(`${data.model} · image generated`);
    } else {
      setImageUrl(null);
      setResult(data.fallback_text || data.enhanced_prompt || q);
      setMeta([data.model, data.note].filter(Boolean).join(' · '));
    }
  };

  const runVideo = async (q: string) => {
    const res = await fetch('/api/media/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief: q }),
    });
    const data = (await res.json()) as { error?: string; plan?: string; model?: string };
    if (!res.ok) throw new Error(data.error || 'Failed');
    setImageUrl(null);
    setResult(data.plan || '');
    setMeta(`Video plan · ${data.model}`);
  };

  const run = async () => {
    const q = brief.trim();
    if (!q || loading) return;
    setLoading(true);
    setResult('');
    setMeta('');
    setImageUrl(null);
    try {
      if (mode === 'image') await runImage(q);
      else if (mode === 'video') await runVideo(q);
      else await runText(q);
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
          Phase 4 — image generation (Flux), video plans, creative copy. Token-saving single-shot.
        </p>
      </div>

      <div className="flex gap-2">
        {(['text', 'image', 'video'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`text-xs px-3 py-1.5 rounded-full border capitalize ${
              mode === m
                ? 'border-[#00f5d4] bg-[#00f5d4]/10 text-[#00f5d4]'
                : 'border-[#2a3548] text-slate-400'
            }`}
          >
            {m === 'text' ? 'Creative copy' : m}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              setBrief(p.command);
              setMode(p.mode);
            }}
            className="text-xs px-3 py-1.5 rounded-full border border-[#2a3548] text-slate-400 hover:border-[#00f5d4]/40 hover:text-[#00f5d4]"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-4">
        <textarea
          className="input-faos min-h-[140px]"
          placeholder={
            mode === 'image'
              ? 'Image prompt for Flux/DALL-E…'
              : mode === 'video'
                ? 'Video brief for edit plan & script…'
                : 'Describe graphics, brand assets, copy…'
          }
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
        />
        {preview && mode === 'text' && (
          <p className="text-[11px] text-emerald-400/80">
            Auto-route: {preview.label} — {preview.reason}
          </p>
        )}
        <button type="button" onClick={() => void run()} disabled={loading} className="btn-faos-primary">
          {loading ? 'Generating…' : mode === 'image' ? 'Generate image' : mode === 'video' ? 'Generate video plan' : 'Deliver via AI agent'}
        </button>
      </div>

      {imageUrl && (
        <div className="rounded-xl border border-[#2a3548] bg-[#0c1222] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Generated" className="max-w-full rounded-lg mx-auto" />
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-[#2a3548] bg-[#0c1222] p-5">
          {meta && <p className="text-[10px] text-slate-500 mb-3">{meta}</p>}
          <pre className="whitespace-pre-wrap text-sm text-slate-200 font-sans">{result}</pre>
        </div>
      )}
    </div>
  );
}
