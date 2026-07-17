'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type MobileBottomNavProps = {
  modules: Array<{ id: string; name: string; icon: string; route: string }>;
};

export function MobileBottomNav({ modules }: MobileBottomNavProps) {
  const pathname = usePathname();

  const primary = [
    modules.find((m) => m.id === 'home'),
    modules.find((m) => m.id === 'jarvis'),
    modules.find((m) => m.id === 'crm' || m.id === 'clients'),
    modules.find((m) => m.id === 'command' || m.route === '/operations'),
    modules.find((m) => m.id === 'settings'),
  ].filter(Boolean) as Array<{ id: string; name: string; icon: string; route: string }>;

  const items = primary.length >= 4 ? primary.slice(0, 5) : modules.slice(0, 5);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#2a3548] bg-[#1a2332]/95 backdrop-blur-lg safe-area-bottom">
      <div className="flex items-stretch justify-around">
        {items.map((m) => {
          const active =
            pathname === m.route || (m.route !== '/' && pathname.startsWith(m.route));
          return (
            <Link
              key={m.id}
              href={m.route}
              className={`flex flex-col items-center justify-center flex-1 min-h-[56px] py-1 gap-0.5 text-[10px] transition touch-manipulation ${
                active ? 'text-[#00f5d4]' : 'text-slate-500'
              }`}
            >
              <span className="text-xl leading-none">{m.icon}</span>
              <span className="truncate max-w-[64px]">{m.name.split(' ')[0]}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
