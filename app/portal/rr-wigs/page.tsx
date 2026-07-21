'use client';

import { useEffect, useState } from 'react';

type Summary = {
  sessions_mtd?: number;
  ad_spend_mtd?: number;
  linkedin_leads?: number;
  seo_keywords?: number;
  factory_skus?: number;
  open_inquiries?: number;
};

type Lead = Record<string, unknown>;
type AdRow = Record<string, unknown>;
type InventoryRow = Record<string, unknown>;
type Inquiry = Record<string, unknown>;

const MEDIA_CALENDAR = [
  { id: 'm1', title: 'Factory Tour Reel', channel: 'Instagram / TikTok', status: 'pending_approval', date: '2026-07-24' },
  { id: 'm2', title: 'OEM Wholesale Brochure', channel: 'PDF / LinkedIn', status: 'approved', date: '2026-07-22' },
  { id: 'm3', title: 'Google Ads Creative Pack A', channel: 'Google Ads', status: 'in_review', date: '2026-07-26' },
];

export default function RrWigsClientPortalPage() {
  const [summary, setSummary] = useState<Summary>({});
  const [linkedin, setLinkedin] = useState<Lead[]>([]);
  const [ads, setAds] = useState<AdRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sumRes, liRes, anRes, invRes, inqRes] = await Promise.all([
          fetch('/api/apps/rr-wigs', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/apps/rr-wigs?resource=linkedin', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/apps/rr-wigs?resource=analytics', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/apps/rr-wigs?resource=inventory', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/apps/rr-wigs?resource=inquiries', { credentials: 'include', cache: 'no-store' }),
        ]);
        if ([sumRes, liRes, anRes, invRes, inqRes].some((r) => r.status === 401 || r.status === 403)) {
          throw new Error('Access denied — RR Wigs client portal only');
        }
        const sumData = (await sumRes.json()) as { summary?: Summary };
        const liData = (await liRes.json()) as { leads?: Lead[] };
        const anData = (await anRes.json()) as { ad_spend?: AdRow[] };
        const invData = (await invRes.json()) as { factory_inventory?: InventoryRow[] };
        const inqData = (await inqRes.json()) as { inquiries?: Inquiry[] };
        if (cancelled) return;
        setSummary(sumData.summary || {});
        setLinkedin(liData.leads || []);
        setAds(anData.ad_spend || []);
        setInventory(invData.factory_inventory || []);
        setInquiries(inqData.inquiries || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load portal');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">RR Wigs Owner Portal</h1>
        <p className="text-sm text-slate-400 mt-1">
          Real-time leads · ad ROI · inventory · media approvals — scoped to your tenant only.
        </p>
      </div>

      <div className="rounded-lg border border-[#9b5de5]/25 bg-[#9b5de5]/5 px-4 py-3 text-xs text-slate-300">
        Isolated client view. Agency revenue, other clients, FMK Wig margins, and JARVIS brain
        commands are hidden from this portal.
      </div>

      {error && (
        <p className="text-xs text-red-400 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Lead Analytics */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-white">Real-time Lead Analytics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Sessions MTD', value: summary.sessions_mtd },
            { label: 'LinkedIn Leads', value: summary.linkedin_leads },
            { label: 'Open Inquiries', value: summary.open_inquiries },
            { label: 'SEO Keywords', value: summary.seo_keywords },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4 text-center">
              <p className="text-2xl font-bold text-[#9b5de5]">{loading ? '…' : (m.value ?? '—')}</p>
              <p className="text-[10px] uppercase text-slate-400 mt-1">{m.label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-300">LinkedIn / Google / Form inquiries</p>
          {linkedin.map((l) => (
            <div key={String(l.id)} className="text-xs flex flex-wrap gap-2 justify-between border-b border-[#1e293b] py-2">
              <span className="text-white font-medium">{String(l.prospect_name)}</span>
              <span className="text-slate-400">{String(l.company)}</span>
              <span className="text-amber-300">{String(l.outreach_status)}</span>
            </div>
          ))}
          {inquiries.map((inq) => (
            <div key={String(inq.id)} className="text-xs border-b border-[#1e293b] py-2">
              <p className="text-white font-medium">{String(inq.company)} · {String(inq.source)}</p>
              <p className="text-slate-400">{String(inq.message)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ad Spend & ROI */}
      <section className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-3">
        <h2 className="text-sm font-bold text-white">Ad Spend & Campaign ROI</h2>
        <p className="text-xs text-slate-400">
          MTD spend:{' '}
          <span className="text-[#00f5d4] font-semibold">
            ${loading ? '…' : (summary.ad_spend_mtd ?? 0)}
          </span>
        </p>
        <div className="space-y-2">
          {ads.map((a) => {
            const spend = Number(a.spend_usd || 0);
            const leads = Number(a.leads || 0);
            const cpl = leads > 0 ? (spend / leads).toFixed(2) : '—';
            return (
              <div
                key={String(a.id)}
                className="text-xs grid grid-cols-2 md:grid-cols-5 gap-2 p-3 rounded-lg bg-[#060b19] border border-[#334155]"
              >
                <span className="text-white font-medium col-span-2">{String(a.campaign)}</span>
                <span className="text-slate-400">{String(a.channel)}</span>
                <span className="text-[#00f5d4]">${spend}</span>
                <span className="text-amber-300">{leads} leads · CPL ${cpl}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Inventory */}
      <section className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-3">
        <h2 className="text-sm font-bold text-white">Order Management & Inventory Stock</h2>
        <div className="space-y-2">
          {inventory.map((item) => (
            <div
              key={String(item.sku)}
              className="text-xs flex flex-wrap justify-between gap-2 p-3 rounded-lg bg-[#060b19] border border-[#334155]"
            >
              <span className="font-mono text-[#00f5d4]">{String(item.sku)}</span>
              <span className="text-white">{String(item.product_name)}</span>
              <span className="text-slate-300">{String(item.units_on_hand)} units</span>
              <span className="text-slate-500">{String(item.production_line)}</span>
            </div>
          ))}
          {!loading && inventory.length === 0 && (
            <p className="text-xs text-slate-500">No factory stock rows yet.</p>
          )}
        </div>
      </section>

      {/* Content Calendar */}
      <section className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-3">
        <h2 className="text-sm font-bold text-white">Content Calendar & Media Approval</h2>
        <div className="space-y-2">
          {MEDIA_CALENDAR.map((item) => (
            <div
              key={item.id}
              className="text-xs flex flex-wrap justify-between gap-2 p-3 rounded-lg bg-[#060b19] border border-[#334155]"
            >
              <span className="text-white font-medium">{item.title}</span>
              <span className="text-slate-400">{item.channel}</span>
              <span className="text-slate-500">{item.date}</span>
              <span
                className={
                  item.status === 'approved'
                    ? 'text-emerald-400'
                    : item.status === 'pending_approval'
                      ? 'text-amber-300'
                      : 'text-[#00bbf9]'
                }
              >
                {item.status.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
