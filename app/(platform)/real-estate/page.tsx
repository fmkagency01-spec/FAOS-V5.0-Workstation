'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageShell, MsgBanner, StatCard } from '@/components/faos/erp/PageShell';
import type {
  ReAnalytics,
  ReClient,
  ReDeal,
  ReLead,
  ReProject,
} from '@/lib/real-estate-types';

type TabId = 'clients' | 'projects' | 'leads' | 'analytics';

const TABS: Array<{ id: TabId; label: string; blurb: string }> = [
  {
    id: 'clients',
    label: 'Client Management',
    blurb: 'Developer / Agency profiles',
  },
  {
    id: 'projects',
    label: 'Project Lifecycle',
    blurb: 'Asset showcase & inventory',
  },
  {
    id: 'leads',
    label: 'Lead Engine',
    blurb: 'Performance marketing pipeline',
  },
  {
    id: 'analytics',
    label: 'Sales & ROI',
    blurb: 'Deals, spend, conversion',
  },
];

function money(n: number, currency = 'BDT'): string {
  try {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

function badge(status: string): string {
  if (['active', 'ready', 'won', 'closed', 'qualified'].includes(status)) {
    return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  }
  if (['paused', 'lost', 'cancelled', 'sold_out'].includes(status)) {
    return 'text-red-300 border-red-500/30 bg-red-500/10';
  }
  if (['negotiation', 'site_visit', 'agreement', 'pre_launch'].includes(status)) {
    return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
  }
  return 'text-sky-300 border-sky-500/30 bg-sky-500/10';
}

export default function RealEstateHubPage() {
  const [tab, setTab] = useState<TabId>('clients');
  const [clients, setClients] = useState<ReClient[]>([]);
  const [projects, setProjects] = useState<ReProject[]>([]);
  const [leads, setLeads] = useState<ReLead[]>([]);
  const [deals, setDeals] = useState<ReDeal[]>([]);
  const [analytics, setAnalytics] = useState<ReAnalytics | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [clientForm, setClientForm] = useState({
    name: '',
    type: 'developer',
    contact_name: '',
    email: '',
    phone: '',
    city: 'Dhaka',
    focus: '',
  });
  const [projectForm, setProjectForm] = useState({
    client_id: '',
    name: '',
    location: '',
    asset_type: 'Apartment',
    units_total: '40',
    units_available: '40',
    price_from: '',
    status: 'planning',
    highlight: '',
    showcase_url: '',
  });
  const [leadForm, setLeadForm] = useState({
    project_id: '',
    name: '',
    phone: '',
    email: '',
    channel: 'facebook',
    campaign: '',
    budget: '',
    status: 'new',
  });
  const [dealForm, setDealForm] = useState({
    project_id: '',
    lead_id: '',
    buyer_name: '',
    unit_label: '',
    value: '',
    ad_spend: '',
    status: 'reserved',
  });

  const load = useCallback(async () => {
    const res = await fetch('/api/real-estate?section=overview', {
      cache: 'no-store',
      credentials: 'include',
    });
    const data = (await res.json()) as {
      clients?: ReClient[];
      projects?: ReProject[];
      leads?: ReLead[];
      deals?: ReDeal[];
      analytics?: ReAnalytics;
      error?: string;
    };
    if (!res.ok) throw new Error(data.error || 'Failed to load PropTech hub');
    setClients(data.clients || []);
    setProjects(data.projects || []);
    setLeads(data.leads || []);
    setDeals(data.deals || []);
    setAnalytics(data.analytics || null);
    setProjectForm((f) =>
      f.client_id || !data.clients?.[0] ? f : { ...f, client_id: data.clients[0].id }
    );
    setLeadForm((f) =>
      f.project_id || !data.projects?.[0]
        ? f
        : { ...f, project_id: data.projects[0].id }
    );
    setDealForm((f) =>
      f.project_id || !data.projects?.[0]
        ? f
        : { ...f, project_id: data.projects[0].id }
    );
  }, []);

  useEffect(() => {
    void load().catch((e) => setMsg(e instanceof Error ? e.message : 'Load failed'));
  }, [load]);

  const post = async (section: string, body: Record<string, unknown>) => {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch(`/api/real-estate?section=${section}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMsg(`Saved · ${section}`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Real Estate & PropTech Hub"
      subtitle="FAOS Master Dashboard — developers, project lifecycle, lead engine & ROI analytics"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active clients" value={String(analytics?.clients_active ?? 0)} />
        <StatCard label="Live projects" value={String(analytics?.projects_live ?? 0)} />
        <StatCard label="Open leads" value={String(analytics?.leads_open ?? 0)} />
        <StatCard
          label="ROI"
          value={`${analytics?.roi_pct ?? 0}%`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg border px-3 py-2 text-left transition ${
              tab === t.id
                ? 'border-[#00f5d4]/50 bg-[#00f5d4]/10 text-[#00f5d4]'
                : 'border-[#2a3548] text-slate-400 hover:border-slate-500'
            }`}
          >
            <span className="block text-xs font-semibold">{t.label}</span>
            <span className="block text-[10px] opacity-70">{t.blurb}</span>
          </button>
        ))}
      </div>

      {msg && <MsgBanner msg={msg} error={/fail|error|required|not found/i.test(msg)} />}

      {tab === 'clients' && (
        <section className="space-y-4">
          <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#00f5d4]">Add developer / agency</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <input className="input-faos" placeholder="Company name *" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} />
              <select className="input-faos" value={clientForm.type} onChange={(e) => setClientForm({ ...clientForm, type: e.target.value })}>
                <option value="developer">Developer</option>
                <option value="agency">Agency</option>
                <option value="broker">Broker</option>
                <option value="investor">Investor</option>
              </select>
              <input className="input-faos" placeholder="Contact name" value={clientForm.contact_name} onChange={(e) => setClientForm({ ...clientForm, contact_name: e.target.value })} />
              <input className="input-faos" placeholder="Phone" value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} />
              <input className="input-faos" placeholder="Email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
              <input className="input-faos" placeholder="City" value={clientForm.city} onChange={(e) => setClientForm({ ...clientForm, city: e.target.value })} />
              <input className="input-faos md:col-span-2" placeholder="Focus (e.g. Gulshan residential)" value={clientForm.focus} onChange={(e) => setClientForm({ ...clientForm, focus: e.target.value })} />
            </div>
            <button
              type="button"
              disabled={loading || !clientForm.name.trim()}
              className="btn-faos-primary"
              onClick={() => void post('clients', clientForm)}
            >
              {loading ? 'Saving…' : 'Add client profile'}
            </button>
          </div>
          <div className="space-y-2">
            {clients.map((c) => (
              <article key={c.id} className="rounded-lg border border-[#2a3548] bg-[#111827] px-4 py-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{c.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {c.type} · {c.contact_name} · {c.city}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">{c.focus}</p>
                  </div>
                  <span className={`h-fit rounded-md border px-2 py-1 text-[10px] uppercase ${badge(c.status)}`}>
                    {c.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'projects' && (
        <section className="space-y-4">
          <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#00f5d4]">New project / asset showcase</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <select className="input-faos" value={projectForm.client_id} onChange={(e) => setProjectForm({ ...projectForm, client_id: e.target.value })}>
                <option value="">Select client *</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input className="input-faos" placeholder="Project name *" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} />
              <input className="input-faos" placeholder="Location" value={projectForm.location} onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })} />
              <input className="input-faos" placeholder="Asset type" value={projectForm.asset_type} onChange={(e) => setProjectForm({ ...projectForm, asset_type: e.target.value })} />
              <input className="input-faos" placeholder="Units total" value={projectForm.units_total} onChange={(e) => setProjectForm({ ...projectForm, units_total: e.target.value })} />
              <input className="input-faos" placeholder="Units available" value={projectForm.units_available} onChange={(e) => setProjectForm({ ...projectForm, units_available: e.target.value })} />
              <input className="input-faos" placeholder="Price from (BDT)" value={projectForm.price_from} onChange={(e) => setProjectForm({ ...projectForm, price_from: e.target.value })} />
              <select className="input-faos" value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}>
                <option value="planning">Planning</option>
                <option value="pre_launch">Pre-launch</option>
                <option value="under_construction">Under construction</option>
                <option value="ready">Ready</option>
                <option value="sold_out">Sold out</option>
              </select>
              <input className="input-faos md:col-span-2" placeholder="Showcase URL" value={projectForm.showcase_url} onChange={(e) => setProjectForm({ ...projectForm, showcase_url: e.target.value })} />
              <input className="input-faos md:col-span-2" placeholder="Highlight" value={projectForm.highlight} onChange={(e) => setProjectForm({ ...projectForm, highlight: e.target.value })} />
            </div>
            <button
              type="button"
              disabled={loading || !projectForm.client_id || !projectForm.name.trim()}
              className="btn-faos-primary"
              onClick={() =>
                void post('projects', {
                  ...projectForm,
                  units_total: Number(projectForm.units_total) || 0,
                  units_available: Number(projectForm.units_available) || 0,
                  price_from: Number(projectForm.price_from) || 0,
                })
              }
            >
              {loading ? 'Saving…' : 'Create project'}
            </button>
          </div>
          <div className="space-y-2">
            {projects.map((p) => (
              <article key={p.id} className="rounded-lg border border-[#2a3548] bg-[#111827] px-4 py-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {p.client_name} · {p.location} · {p.asset_type}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {p.units_available}/{p.units_total} units · from {money(p.price_from, p.currency)}
                      {p.highlight ? ` · ${p.highlight}` : ''}
                    </p>
                  </div>
                  <span className={`h-fit rounded-md border px-2 py-1 text-[10px] uppercase ${badge(p.status)}`}>
                    {p.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'leads' && (
        <section className="space-y-4">
          <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#00f5d4]">Capture marketing lead</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <select className="input-faos" value={leadForm.project_id} onChange={(e) => setLeadForm({ ...leadForm, project_id: e.target.value })}>
                <option value="">Project *</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select className="input-faos" value={leadForm.channel} onChange={(e) => setLeadForm({ ...leadForm, channel: e.target.value })}>
                <option value="facebook">Facebook Ads</option>
                <option value="google">Google Ads</option>
                <option value="tiktok">TikTok</option>
                <option value="referral">Referral</option>
                <option value="walk_in">Walk-in</option>
                <option value="organic">Organic</option>
                <option value="other">Other</option>
              </select>
              <input className="input-faos" placeholder="Lead name *" value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} />
              <input className="input-faos" placeholder="Phone" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} />
              <input className="input-faos" placeholder="Email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} />
              <input className="input-faos" placeholder="Campaign" value={leadForm.campaign} onChange={(e) => setLeadForm({ ...leadForm, campaign: e.target.value })} />
              <input className="input-faos" placeholder="Budget intent" value={leadForm.budget} onChange={(e) => setLeadForm({ ...leadForm, budget: e.target.value })} />
              <select className="input-faos" value={leadForm.status} onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value })}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="site_visit">Site visit</option>
                <option value="negotiation">Negotiation</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <button
              type="button"
              disabled={loading || !leadForm.project_id || !leadForm.name.trim()}
              className="btn-faos-primary"
              onClick={() =>
                void post('leads', {
                  ...leadForm,
                  budget: leadForm.budget ? Number(leadForm.budget) : undefined,
                })
              }
            >
              {loading ? 'Saving…' : 'Add lead'}
            </button>
          </div>
          <div className="space-y-2">
            {leads.map((l) => (
              <article key={l.id} className="rounded-lg border border-[#2a3548] bg-[#111827] px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{l.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {l.project_name} · {l.channel}
                      {l.campaign ? ` · ${l.campaign}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {l.phone || '—'}
                      {l.budget != null ? ` · budget ${money(l.budget)}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-md border px-2 py-1 text-[10px] uppercase ${badge(l.status)}`}>
                      {l.status.replace(/_/g, ' ')}
                    </span>
                    <select
                      className="input-faos text-[11px] py-1"
                      value={l.status}
                      onChange={(e) =>
                        void post('lead-status', { id: l.id, status: e.target.value })
                      }
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="site_visit">Site visit</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'analytics' && (
        <section className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Pipeline value" value={money(analytics?.pipeline_value ?? 0)} />
            <StatCard label="Closed sales" value={money(analytics?.closed_value ?? 0)} />
            <StatCard label="Ad spend" value={money(analytics?.ad_spend_total ?? 0)} />
            <StatCard label="CPL" value={money(analytics?.cpl ?? 0)} />
          </div>
          <p className="text-xs text-slate-400">
            Conversion {analytics?.conversion_rate_pct ?? 0}% · Won leads {analytics?.leads_won ?? 0}
          </p>

          <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#00f5d4]">Log sale / booking</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <select className="input-faos" value={dealForm.project_id} onChange={(e) => setDealForm({ ...dealForm, project_id: e.target.value })}>
                <option value="">Project *</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select className="input-faos" value={dealForm.lead_id} onChange={(e) => setDealForm({ ...dealForm, lead_id: e.target.value })}>
                <option value="">Link lead (optional)</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>{l.name} · {l.project_name}</option>
                ))}
              </select>
              <input className="input-faos" placeholder="Buyer name *" value={dealForm.buyer_name} onChange={(e) => setDealForm({ ...dealForm, buyer_name: e.target.value })} />
              <input className="input-faos" placeholder="Unit label" value={dealForm.unit_label} onChange={(e) => setDealForm({ ...dealForm, unit_label: e.target.value })} />
              <input className="input-faos" placeholder="Deal value" value={dealForm.value} onChange={(e) => setDealForm({ ...dealForm, value: e.target.value })} />
              <input className="input-faos" placeholder="Attributed ad spend" value={dealForm.ad_spend} onChange={(e) => setDealForm({ ...dealForm, ad_spend: e.target.value })} />
              <select className="input-faos md:col-span-2" value={dealForm.status} onChange={(e) => setDealForm({ ...dealForm, status: e.target.value })}>
                <option value="reserved">Reserved</option>
                <option value="booking">Booking</option>
                <option value="agreement">Agreement</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <button
              type="button"
              disabled={loading || !dealForm.project_id || !dealForm.buyer_name.trim()}
              className="btn-faos-primary"
              onClick={() =>
                void post('deals', {
                  ...dealForm,
                  lead_id: dealForm.lead_id || undefined,
                  value: Number(dealForm.value) || 0,
                  ad_spend: Number(dealForm.ad_spend) || 0,
                })
              }
            >
              {loading ? 'Saving…' : 'Record deal'}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase text-slate-500">By channel</h3>
              {(analytics?.by_channel || []).map((c) => (
                <div key={c.channel} className="flex justify-between text-xs text-slate-300">
                  <span className="capitalize">{c.channel.replace(/_/g, ' ')}</span>
                  <span>{c.leads} leads · {c.won} won</span>
                </div>
              ))}
              {(analytics?.by_channel || []).length === 0 && (
                <p className="text-xs text-slate-600">No channel data yet.</p>
              )}
            </div>
            <div className="rounded-xl border border-[#2a3548] bg-[#111827] p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase text-slate-500">By project</h3>
              {(analytics?.by_project || []).map((p) => (
                <div key={p.project_id} className="text-xs text-slate-300 space-y-0.5">
                  <div className="flex justify-between gap-2">
                    <span className="truncate">{p.project_name}</span>
                    <span>{p.available_units} left</span>
                  </div>
                  <p className="text-slate-500">
                    {p.leads} leads · closed {money(p.closed_value)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white">Recent deals</h3>
            {deals.map((d) => (
              <article key={d.id} className="rounded-lg border border-[#2a3548] bg-[#111827] px-4 py-3 flex flex-wrap justify-between gap-2">
                <div>
                  <p className="text-sm text-white font-medium">{d.buyer_name} · {d.unit_label}</p>
                  <p className="text-xs text-slate-400">{d.project_name}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {money(d.value, d.currency)} · ad {money(d.ad_spend, d.currency)}
                  </p>
                </div>
                <span className={`h-fit rounded-md border px-2 py-1 text-[10px] uppercase ${badge(d.status)}`}>
                  {d.status}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
