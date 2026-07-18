import Link from 'next/link';

export type QuickLink = {
  label: string;
  href: string;
  icon?: string;
};

export function QuickActions({ links, title = 'Shortcuts' }: { links: QuickLink[]; title?: string }) {
  if (links.length === 0) return null;
  return (
    <div className="rounded-xl border border-[#00f5d4]/20 bg-[#00f5d4]/5 p-4">
      <p className="text-xs font-bold text-[#00f5d4] mb-3">{title}</p>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[#111827] border border-[#2a3548] text-[11px] text-slate-200 hover:border-[#00f5d4]/40 hover:text-[#00f5d4] transition"
          >
            {link.icon && <span>{link.icon}</span>}
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DetailGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 grid sm:grid-cols-2 gap-4 text-sm">
      {children}
    </div>
  );
}

export function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-slate-500 mb-1">{label}</p>
      <p className="text-slate-200 break-words">{value ?? '—'}</p>
    </div>
  );
}
