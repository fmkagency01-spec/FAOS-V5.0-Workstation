'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type Check = {
  label: string;
  status: 'ok' | 'warn' | 'fail' | 'checking';
  detail: string;
};

export default function SystemStatusPage() {
  const [checks, setChecks] = useState<Check[]>([
    { label: 'FAOS Dashboard', status: 'checking', detail: 'Checking...' },
    { label: 'Render Backend', status: 'checking', detail: 'Checking...' },
    { label: 'OpenRouter AI', status: 'checking', detail: 'Checking...' },
    { label: 'Create Pillar', status: 'checking', detail: 'Checking...' },
    { label: 'Token Safety Guard', status: 'checking', detail: 'Checking...' },
  ]);
  const [allOk, setAllOk] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const next: Check[] = [];

      try {
        const healthRes = await fetch('/api/health', { cache: 'no-store' });
        const health = (await healthRes.json()) as {
          gateway?: { openrouter?: string };
          backend?: {
            url?: string;
            render?: { status?: string; message?: string; docs_url?: string };
          };
          pillars?: { create?: { entities?: number; status?: string } };
        };

        next.push({
          label: 'FAOS Dashboard',
          status: healthRes.ok ? 'ok' : 'fail',
          detail: healthRes.ok ? 'Dashboard API is online' : `Health check failed (${healthRes.status})`,
        });

        const renderStatus = health.backend?.render?.status;
        next.push({
          label: 'Render Backend',
          status: renderStatus === 'online' ? 'ok' : renderStatus === 'not_configured' ? 'warn' : 'fail',
          detail:
            renderStatus === 'online'
              ? health.backend?.render?.message || 'Backend connected'
              : 'Backend not reachable — wait 60 seconds and refresh (free tier wake-up)',
        });

        const orStatus = health.gateway?.openrouter;
        next.push({
          label: 'OpenRouter AI',
          status: orStatus === 'configured' ? 'ok' : 'warn',
          detail:
            orStatus === 'configured'
              ? 'AI key is configured (server-side only — safe)'
              : 'AI key missing — chat commands will not work until key is added in Vercel',
        });

        next.push({
          label: 'Create Pillar',
          status: health.pillars?.create?.status === 'mounted' ? 'ok' : 'warn',
          detail: `${health.pillars?.create?.entities ?? 0} retail entities loaded (FMK WIG, MK Clothing, etc.)`,
        });
      } catch {
        next.push(
          { label: 'FAOS Dashboard', status: 'fail', detail: 'Could not reach dashboard API' },
          { label: 'Render Backend', status: 'fail', detail: 'Check failed' },
          { label: 'OpenRouter AI', status: 'fail', detail: 'Check failed' },
          { label: 'Create Pillar', status: 'fail', detail: 'Check failed' }
        );
      }

      try {
        const guardRes = await fetch('/api/harvest', { cache: 'no-store' });
        const guard = (await guardRes.json()) as { limits?: { max_daily_requests?: number } };
        next.push({
          label: 'Token Safety Guard',
          status: guard.limits?.max_daily_requests === 100 ? 'ok' : 'warn',
          detail: 'Max 100 AI calls/day · stops loops if response is too small (≤5 tokens)',
        });
      } catch {
        next.push({
          label: 'Token Safety Guard',
          status: 'warn',
          detail: 'Could not verify safety limits',
        });
      }

      if (!cancelled) {
        setChecks(next);
        setAllOk(next.every((c) => c.status === 'ok'));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const color = (status: Check['status']) =>
    status === 'ok'
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
      : status === 'warn'
        ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
        : status === 'fail'
          ? 'text-red-400 border-red-500/40 bg-red-500/10'
          : 'text-slate-400 border-slate-500/40 bg-slate-500/10';

  const icon = (status: Check['status']) =>
    status === 'ok' ? '✅' : status === 'warn' ? '⚠️' : status === 'fail' ? '❌' : '⏳';

  return (
    <div className="min-h-screen bg-[#060b19] text-[#e2e8f0] p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#00f5d4]">FAOS v5.0 System Check</p>
          <h1 className="text-3xl font-extrabold text-white">
            {allOk ? 'All Systems Ready' : 'System Status'}
          </h1>
          <p className="text-sm text-slate-400">
            No technical steps needed — this page checks everything automatically.
          </p>
        </div>

        <div className="space-y-3">
          {checks.map((check) => (
            <div
              key={check.label}
              className={`rounded-xl border p-4 ${color(check.status)}`}
            >
              <p className="font-bold text-sm">
                {icon(check.status)} {check.label}
              </p>
              <p className="text-xs mt-1 opacity-90">{check.detail}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[#334155] bg-[#0f172a] p-5 text-sm space-y-3">
          <p className="font-bold text-white">Your links (bookmark these)</p>
          <ul className="space-y-2 text-xs text-slate-300">
            <li>
              <span className="text-[#00f5d4]">Dashboard:</span>{' '}
              <a className="underline" href="https://faos-v5-0-workstation.vercel.app">
                faos-v5-0-workstation.vercel.app
              </a>
            </li>
            <li>
              <span className="text-[#00f5d4]">Manufacturing Console:</span>{' '}
              <a className="underline" href="https://faos-v5-0-workstation.vercel.app/dashboard/create-pillar">
                Create Pillar page
              </a>
            </li>
            <li>
              <span className="text-[#00f5d4]">Backend API docs:</span>{' '}
              <a className="underline" href="https://faos-backend.onrender.com/docs" target="_blank" rel="noopener noreferrer">
                faos-backend.onrender.com/docs
              </a>
            </li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Link
            href="/"
            className="flex-1 text-center bg-[#00f5d4] text-[#060b19] font-bold py-3 rounded-lg hover:bg-[#00bbf9] transition text-sm"
          >
            Open Dashboard →
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-[#334155] text-white font-bold py-3 rounded-lg hover:bg-[#475569] transition text-sm"
          >
            Refresh Check
          </button>
        </div>

        <p className="text-[11px] text-slate-500 text-center">
          Token safety: never run automation loops. Max 100 AI calls per day. System auto-blocks waste.
        </p>
      </div>
    </div>
  );
}
