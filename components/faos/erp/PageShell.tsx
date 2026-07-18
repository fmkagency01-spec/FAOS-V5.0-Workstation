import Link from 'next/link';
import type { ReactNode } from 'react';

type PageShellProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function PageShell({
  title,
  subtitle,
  backHref,
  backLabel = '← Back',
  actions,
  children,
}: PageShellProps) {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-24 md:pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {backHref && (
            <Link href={backHref} className="text-xs text-[#00bbf9] hover:underline mb-2 inline-block">
              {backLabel}
            </Link>
          )}
          <h1 className="text-xl md:text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#2a3548] bg-[#111827] p-4">
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

export function MsgBanner({ msg, error }: { msg?: string; error?: boolean }) {
  if (!msg) return null;
  return (
    <p className={`text-xs ${error ? 'text-red-400' : 'text-slate-400'}`}>{msg}</p>
  );
}
