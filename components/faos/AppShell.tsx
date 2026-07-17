'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  getAllModules,
  getEnabledModules,
  loadModulePreferences,
  type FaosModule,
} from '@/lib/modules-registry';
import { CommandBar } from '@/components/faos/CommandBar';
import { JarvisPanel } from '@/components/faos/JarvisPanel';

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [modules, setModules] = useState<FaosModule[]>(getAllModules());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    setModules(getEnabledModules(loadModulePreferences()));
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0c1222] text-slate-100">
      {/* Odoo-style icon rail */}
      <aside className="hidden md:flex w-14 flex-col items-center py-3 gap-2 bg-[#1a2332] border-r border-[#2a3548] shrink-0">
        <Link href="/" className="w-10 h-10 rounded-lg bg-[#00f5d4] text-[#0c1222] flex items-center justify-center font-black text-lg" title="FAOS Apps">
          F
        </Link>
        {modules.slice(0, 8).map((m) => (
          <Link
            key={m.id}
            href={m.route}
            title={m.name}
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition ${
              pathname === m.route || pathname.startsWith(m.route + '/')
                ? 'bg-[#00f5d4]/15 ring-1 ring-[#00f5d4]/40'
                : 'hover:bg-white/5'
            }`}
          >
            {m.icon}
          </Link>
        ))}
      </aside>

      {/* Module sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-60' : 'w-0'} transition-all overflow-hidden bg-[#111827] border-r border-[#2a3548] shrink-0 flex flex-col`}
      >
        <div className="p-4 border-b border-[#2a3548]">
          <p className="text-[10px] uppercase tracking-widest text-[#00f5d4] font-bold">FAOS Business Suite</p>
          <p className="text-xs text-slate-400 mt-1">Modular ERP · Token-saving agents</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {modules.map((m) => {
            const active = pathname === m.route || (m.route !== '/' && pathname.startsWith(m.route));
            return (
              <Link
                key={m.id}
                href={m.route}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition ${
                  active
                    ? 'bg-[#00f5d4]/10 text-[#00f5d4] font-semibold'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{m.icon}</span>
                <span className="truncate">{m.name}</span>
                {m.tier === 'pro' && (
                  <span className="ml-auto text-[9px] uppercase bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">Pro</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-[#2a3548] text-[10px] text-slate-500">
          JARVIS v5.1 · 25 agents · Token-save ON
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — Odoo-style */}
        <header className="h-12 shrink-0 flex items-center gap-3 px-4 bg-[#1a2332] border-b border-[#2a3548]">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="text-slate-400 hover:text-white p-1"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <CommandBar variant="bar" />
          <JarvisPanel compact />
          <span className="hidden xl:inline text-[10px] font-mono text-[#00f5d4] bg-[#00f5d4]/10 px-2 py-1 rounded shrink-0">
            v5.1
          </span>
          <Link href="/status" className="text-xs text-slate-400 hover:text-[#00f5d4]">
            Health
          </Link>
          <div className="w-8 h-8 rounded-full bg-[#00f5d4]/20 flex items-center justify-center text-xs font-bold text-[#00f5d4]">
            FM
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#0c1222]">{children}</main>
      </div>
    </div>
  );
}
