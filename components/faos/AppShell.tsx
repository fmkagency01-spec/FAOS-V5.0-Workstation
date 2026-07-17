'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  getAllModules,
  getEnabledModules,
  loadModulePreferences,
  type FaosModule,
} from '@/lib/modules-registry';
import { filterModulesForRole, getRoleInfo } from '@/lib/access-client';
import { CommandBar } from '@/components/faos/CommandBar';
import { JarvisPanel } from '@/components/faos/JarvisPanel';
import { MobileBottomNav } from '@/components/faos/MobileBottomNav';

type SessionUser = {
  username: string;
  name: string;
  role: string;
};

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [modules, setModules] = useState<FaosModule[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/login', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { user?: SessionUser };
      if (data.user) setUser(data.user);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession, pathname]);

  useEffect(() => {
    const enabled = getEnabledModules(loadModulePreferences());
    if (user?.role) {
      setModules(filterModulesForRole(enabled, user.role));
    } else {
      setModules(enabled);
    }
  }, [pathname, user?.role]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  };

  const roleInfo = user ? getRoleInfo(user.role) : null;
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'FM';

  const canSeeJarvis = modules.some((m) => m.id === 'jarvis');

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#0c1222] text-slate-100">
      {/* Desktop icon rail */}
      <aside className="hidden lg:flex w-14 flex-col items-center py-3 gap-2 bg-[#1a2332] border-r border-[#2a3548] shrink-0 safe-area-top">
        <Link
          href="/"
          className="w-10 h-10 rounded-lg bg-[#00f5d4] text-[#0c1222] flex items-center justify-center font-black text-lg"
          title="FAOS Apps"
        >
          F
        </Link>
        {modules.slice(0, 10).map((m) => (
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

      {/* Sidebar — desktop expanded / mobile drawer */}
      <aside
        className={`${
          sidebarOpen || mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:relative z-50 md:z-auto w-72 md:w-60 h-full transition-transform overflow-hidden bg-[#111827] border-r border-[#2a3548] shrink-0 flex flex-col safe-area-top`}
      >
        <div className="p-4 border-b border-[#2a3548] flex justify-between items-start">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#00f5d4] font-bold">
              FAOS v5.3 TAC
            </p>
            <p className="text-xs text-slate-400 mt-1">{roleInfo?.label || 'Business Suite'}</p>
          </div>
          <button
            type="button"
            className="md:hidden text-slate-400 min-h-[44px] min-w-[44px]"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 overscroll-contain">
          {modules.map((m) => {
            const active =
              pathname === m.route || (m.route !== '/' && pathname.startsWith(m.route));
            return (
              <Link
                key={m.id}
                href={m.route}
                className={`flex items-center gap-2.5 px-3 py-3 md:py-2.5 rounded-md text-sm transition min-h-[44px] ${
                  active
                    ? 'bg-[#00f5d4]/10 text-[#00f5d4] font-semibold'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-lg">{m.icon}</span>
                <span className="truncate">{m.name}</span>
              </Link>
            );
          })}
        </nav>
        {user && (
          <div className="p-3 border-t border-[#2a3548] space-y-2">
            <p className="text-xs text-white font-medium truncate">{user.name}</p>
            <p className="text-[10px] text-slate-500">{roleInfo?.label}</p>
            <button
              type="button"
              onClick={() => void logout()}
              className="text-[10px] text-red-400 hover:text-red-300 min-h-[44px]"
            >
              Sign out
            </button>
          </div>
        )}
      </aside>

      {(sidebarOpen || mobileMenuOpen) && (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => {
            setMobileMenuOpen(false);
            setSidebarOpen(false);
          }}
          aria-label="Close overlay"
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="shrink-0 flex items-center gap-2 px-3 md:px-4 py-2 md:py-0 md:h-12 bg-[#1a2332] border-b border-[#2a3548] safe-area-top">
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 768) setMobileMenuOpen(true);
              else setSidebarOpen((v) => !v);
            }}
            className="text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            aria-label="Menu"
          >
            ☰
          </button>

          <div className="hidden md:flex flex-1 min-w-0">
            <CommandBar variant="bar" />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {canSeeJarvis && (
              <div className="hidden sm:block">
                <JarvisPanel compact />
              </div>
            )}
            <span className="hidden xl:inline text-[10px] font-mono text-[#00f5d4] bg-[#00f5d4]/10 px-2 py-1 rounded">
              v5.3
            </span>
            {modules.some((m) => m.id === 'status') && (
              <Link
                href="/status"
                className="hidden sm:inline text-xs text-slate-400 hover:text-[#00f5d4] min-h-[44px] flex items-center px-2"
              >
                Health
              </Link>
            )}
            <div
              className="w-9 h-9 rounded-full bg-[#00f5d4]/20 flex items-center justify-center text-[10px] font-bold text-[#00f5d4]"
              title={user?.name}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Mobile search / command — full width below header */}
        <div className="md:hidden px-3 py-2 border-b border-[#2a3548]/50 bg-[#0c1222]">
          <CommandBar variant="bar" />
        </div>

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0c1222] pb-20 md:pb-0 overscroll-contain">
          {children}
        </main>

        <MobileBottomNav modules={modules} />
      </div>
    </div>
  );
}
