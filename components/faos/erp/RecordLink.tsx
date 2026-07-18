import Link from 'next/link';
import type { ReactNode } from 'react';

type RecordLinkProps = {
  href: string;
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: ReactNode;
  right?: ReactNode;
};

export function RecordLink({ href, title, subtitle, meta, badge, right }: RecordLinkProps) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-[#2a3548] bg-[#111827] p-4 hover:border-[#00f5d4]/40 hover:bg-[#00f5d4]/5 transition group"
    >
      <div className="flex justify-between gap-4 items-start">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-white group-hover:text-[#00f5d4] transition">{title}</p>
            {badge}
          </div>
          {subtitle && <p className="text-xs text-slate-400 mt-1 truncate">{subtitle}</p>}
          {meta && <p className="text-[10px] font-mono text-slate-600 mt-1">{meta}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {right}
          <span className="text-slate-600 group-hover:text-[#00f5d4] text-sm">›</span>
        </div>
      </div>
    </Link>
  );
}
