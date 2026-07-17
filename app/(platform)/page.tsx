'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getEnabledModules, type FaosModule } from '@/lib/modules-registry';

export default function AppsHomePage() {
  const [modules, setModules] = useState<FaosModule[]>([]);

  useEffect(() => {
    setModules(getEnabledModules());
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white">FAOS Business Suite</h1>
        <p className="text-sm text-slate-400 mt-2 max-w-2xl">
          Odoo-style modular platform — enable apps on demand, assign clients & projects, and route
          agent workflows with token-saving mode (no credit drain loops).
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {modules.map((m) => (
          <Link
            key={m.id}
            href={m.route}
            className="group rounded-xl border border-[#2a3548] bg-[#111827] p-5 hover:border-[#00f5d4]/40 hover:bg-[#00f5d4]/5 transition"
          >
            <div className="text-3xl mb-3">{m.icon}</div>
            <h2 className="font-semibold text-white text-sm group-hover:text-[#00f5d4]">{m.name}</h2>
            <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">{m.description}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-600 mt-3">{m.category}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5">
          <p className="text-xs font-bold text-[#00f5d4]">Quick assign</p>
          <p className="text-sm text-slate-300 mt-2">Go to Agents → paste client command → agents sync on Render backend.</p>
          <Link href="/agents" className="inline-block mt-3 text-xs text-[#00bbf9] hover:underline">Open Agent Workflow →</Link>
        </div>
        <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5">
          <p className="text-xs font-bold text-emerald-400">Token safety</p>
          <p className="text-sm text-slate-300 mt-2">Max 100 AI calls/day · auto-block loops · lean 280-token replies.</p>
          <Link href="/settings" className="inline-block mt-3 text-xs text-[#00bbf9] hover:underline">Module settings →</Link>
        </div>
        <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5">
          <p className="text-xs font-bold text-amber-400">Upgrade modules</p>
          <p className="text-sm text-slate-300 mt-2">Turn Pro/Enterprise apps on when you need them — pay-as-you-grow.</p>
          <Link href="/settings" className="inline-block mt-3 text-xs text-[#00bbf9] hover:underline">Customize apps →</Link>
        </div>
      </div>
    </div>
  );
}
