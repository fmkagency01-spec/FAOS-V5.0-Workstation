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
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          FAOS <span className="text-[#00f5d4]">v5.1</span> Business Suite
        </h1>
        <p className="text-sm text-slate-400 mt-2 max-w-2xl">
          JARVIS orchestrator — chat or voice command, 25 shell agents, full ERP (CRM, invoicing,
          inventory, HR), creative & video studio. Scale 10x–100x without leaving one workstation.
        </p>
        <Link
          href="/jarvis"
          className="inline-flex mt-4 items-center gap-2 px-4 py-2 rounded-lg bg-[#00f5d4]/10 border border-[#00f5d4]/30 text-[#00f5d4] text-sm font-bold hover:bg-[#00f5d4]/20"
        >
          🧠 Open JARVIS — voice & chat
        </Link>
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
        <div className="rounded-xl border border-[#00f5d4]/20 bg-[#00f5d4]/5 p-5">
          <p className="text-xs font-bold text-[#00f5d4]">JARVIS commands</p>
          <p className="text-sm text-slate-300 mt-2">
            &quot;Create invoice for Client X $5000&quot; · &quot;Add WIG stock 100 units&quot; · &quot;Generate banner image&quot;
          </p>
          <Link href="/jarvis" className="inline-block mt-3 text-xs text-[#00bbf9] hover:underline">
            Voice & chat →
          </Link>
        </div>
        <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5">
          <p className="text-xs font-bold text-emerald-400">25 shell agents</p>
          <p className="text-sm text-slate-300 mt-2">Brand, CRM, finance, HR, creative, video, legal, IT — one gateway.</p>
          <Link href="/agents" className="inline-block mt-3 text-xs text-[#00bbf9] hover:underline">Agent workflow →</Link>
        </div>
        <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5">
          <p className="text-xs font-bold text-amber-400">Phase 3 ERP</p>
          <p className="text-sm text-slate-300 mt-2">Invoicing, inventory, HR modules live — synced to Render backend.</p>
          <Link href="/invoicing" className="inline-block mt-3 text-xs text-[#00bbf9] hover:underline">Invoicing →</Link>
        </div>
      </div>
    </div>
  );
}
