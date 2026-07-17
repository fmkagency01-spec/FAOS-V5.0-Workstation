'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { getEnabledModules, type FaosModule } from '@/lib/modules-registry';
import { filterModulesForRole } from '@/lib/access-client';

function HomeContent() {
  const searchParams = useSearchParams();
  const denied = searchParams.get('denied');
  const [modules, setModules] = useState<FaosModule[]>([]);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    setModules(getEnabledModules());
    void fetch('/api/auth/login')
      .then((r) => r.json())
      .then((d: { user?: { name?: string; role?: string } }) => {
        if (d.user?.name) setUserName(d.user.name);
        if (d.user?.role) {
          setModules(filterModulesForRole(getEnabledModules(), d.user.role));
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 md:pb-8">
      {denied && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          That section is not available for your role. Contact the owner if you need access.
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-xl md:text-3xl font-bold text-white">
          FAOS <span className="text-[#00f5d4]">v5.2</span>
          {userName && (
            <span className="block text-sm font-normal text-slate-400 mt-1">
              Welcome, {userName}
            </span>
          )}
        </h1>
        <p className="text-sm text-slate-400 mt-2 max-w-2xl">
          Secure workstation — your role sees only assigned modules. Desktop & iPhone ready.
        </p>
        {modules.some((m) => m.id === 'jarvis') && (
          <Link
            href="/jarvis"
            className="inline-flex mt-4 items-center gap-2 px-4 py-3 rounded-lg bg-[#00f5d4]/10 border border-[#00f5d4]/30 text-[#00f5d4] text-sm font-bold hover:bg-[#00f5d4]/20 min-h-[48px] touch-manipulation"
          >
            🧠 Open JARVIS
          </Link>
        )}
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
        {modules.some((m) => m.id === 'jarvis') && (
          <div className="rounded-xl border border-[#00f5d4]/20 bg-[#00f5d4]/5 p-5">
            <p className="text-xs font-bold text-[#00f5d4]">JARVIS</p>
            <p className="text-sm text-slate-300 mt-2">Voice & chat commands — role-scoped access.</p>
            <Link href="/jarvis" className="inline-block mt-3 text-xs text-[#00bbf9] hover:underline min-h-[44px] flex items-center">
              Open JARVIS →
            </Link>
          </div>
        )}
        {modules.some((m) => m.id === 'team') && (
          <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5">
            <p className="text-xs font-bold text-amber-400">Team security</p>
            <p className="text-sm text-slate-300 mt-2">Manage roles and teammate access policies.</p>
            <Link href="/team" className="inline-block mt-3 text-xs text-[#00bbf9] hover:underline">
              Team policy →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AppsHomePage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500 text-sm">Loading…</div>}>
      <HomeContent />
    </Suspense>
  );
}
