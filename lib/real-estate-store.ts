/**
 * FAOS Real Estate & PropTech Hub — JSON file store.
 * Portable to SQLite / Postgres later. Vercel-safe: writes under /tmp only.
 */

import seed from "@/data/faos_real_estate_hub.json";
import type {
  ReAnalytics,
  ReClient,
  ReClientCreate,
  ReDeal,
  ReDealCreate,
  ReLead,
  ReLeadCreate,
  ReProject,
  ReProjectCreate,
} from "@/lib/real-estate-types";
import {
  resolveSeedDataFile,
  resolveWritableDbFile,
  safeReadJsonFile,
  safeWriteJson,
} from "@/lib/writable-data-path";

type ReDb = {
  table: "faos_real_estate_hub";
  version: number;
  module: "real-estate";
  clients: ReClient[];
  projects: ReProject[];
  leads: ReLead[];
  deals: ReDeal[];
};

const DB_FILE = "faos_real_estate_hub.json";

let memoryDb: ReDb | null = null;

function writePath(): string {
  return resolveWritableDbFile(DB_FILE);
}

function cloneSeed(): ReDb {
  const s = seed as ReDb;
  return {
    table: "faos_real_estate_hub",
    version: s.version || 1,
    module: "real-estate",
    clients: Array.isArray(s.clients) ? structuredClone(s.clients) : [],
    projects: Array.isArray(s.projects) ? structuredClone(s.projects) : [],
    leads: Array.isArray(s.leads) ? structuredClone(s.leads) : [],
    deals: Array.isArray(s.deals) ? structuredClone(s.deals) : [],
  };
}

function normalizeDb(parsed: Partial<ReDb>): ReDb {
  return {
    table: "faos_real_estate_hub",
    version: parsed.version || 1,
    module: "real-estate",
    clients: Array.isArray(parsed.clients) ? parsed.clients : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    leads: Array.isArray(parsed.leads) ? parsed.leads : [],
    deals: Array.isArray(parsed.deals) ? parsed.deals : [],
  };
}

function loadDb(): ReDb {
  if (memoryDb) return memoryDb;

  const fromWritable = safeReadJsonFile<ReDb>(writePath());
  if (fromWritable) {
    memoryDb = normalizeDb(fromWritable);
    return memoryDb;
  }

  const fromSeed = safeReadJsonFile<ReDb>(resolveSeedDataFile(DB_FILE));
  if (fromSeed) {
    memoryDb = normalizeDb(fromSeed);
    return memoryDb;
  }

  memoryDb = cloneSeed();
  return memoryDb;
}

function saveDb(db: ReDb): void {
  memoryDb = db;
  safeWriteJson(writePath(), db, "real-estate hub");
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function now(): string {
  return new Date().toISOString();
}

export function listReClients(): ReClient[] {
  return loadDb()
    .clients.slice()
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

export function createReClient(input: ReClientCreate): ReClient {
  const db = loadDb();
  const ts = now();
  const row: ReClient = {
    id: uid("re_cli"),
    name: input.name.trim(),
    type: input.type || "developer",
    contact_name: (input.contact_name || "").trim() || "—",
    email: (input.email || "").trim(),
    phone: (input.phone || "").trim(),
    city: (input.city || "").trim() || "Dhaka",
    focus: (input.focus || "").trim() || "General",
    status: input.status || "active",
    notes: input.notes?.trim() || undefined,
    created_at: ts,
    updated_at: ts,
  };
  db.clients.unshift(row);
  saveDb(db);
  return row;
}

export function listReProjects(clientId?: string): ReProject[] {
  let rows = loadDb().projects.slice();
  if (clientId) rows = rows.filter((p) => p.client_id === clientId);
  return rows.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

export function createReProject(input: ReProjectCreate): ReProject {
  const db = loadDb();
  const client = db.clients.find((c) => c.id === input.client_id);
  if (!client) throw new Error("client_id not found — create a developer/agency first");
  const ts = now();
  const total = Math.max(0, Number(input.units_total ?? 0));
  const available = Math.min(
    total,
    Math.max(0, Number(input.units_available ?? total))
  );
  const row: ReProject = {
    id: uid("re_prj"),
    client_id: client.id,
    client_name: client.name,
    name: input.name.trim(),
    location: (input.location || "").trim() || "TBD",
    asset_type: (input.asset_type || "").trim() || "Apartment",
    units_total: total,
    units_available: available,
    price_from: Math.max(0, Number(input.price_from ?? 0)),
    currency: (input.currency || "BDT").trim() || "BDT",
    status: input.status || "planning",
    showcase_url: input.showcase_url?.trim() || undefined,
    highlight: input.highlight?.trim() || undefined,
    created_at: ts,
    updated_at: ts,
  };
  db.projects.unshift(row);
  saveDb(db);
  return row;
}

export function listReLeads(projectId?: string): ReLead[] {
  let rows = loadDb().leads.slice();
  if (projectId) rows = rows.filter((l) => l.project_id === projectId);
  return rows.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

export function createReLead(input: ReLeadCreate): ReLead {
  const db = loadDb();
  const project = db.projects.find((p) => p.id === input.project_id);
  if (!project) throw new Error("project_id not found");
  const ts = now();
  const row: ReLead = {
    id: uid("re_lead"),
    project_id: project.id,
    project_name: project.name,
    client_id: project.client_id,
    name: input.name.trim(),
    phone: (input.phone || "").trim(),
    email: input.email?.trim() || undefined,
    channel: input.channel || "other",
    campaign: input.campaign?.trim() || undefined,
    budget: input.budget != null ? Math.max(0, Number(input.budget)) : undefined,
    status: input.status || "new",
    notes: input.notes?.trim() || undefined,
    created_at: ts,
    updated_at: ts,
  };
  db.leads.unshift(row);
  saveDb(db);
  return row;
}

export function updateReLeadStatus(id: string, status: ReLead["status"]): ReLead {
  const db = loadDb();
  const row = db.leads.find((l) => l.id === id);
  if (!row) throw new Error("Lead not found");
  row.status = status;
  row.updated_at = now();
  saveDb(db);
  return row;
}

export function listReDeals(projectId?: string): ReDeal[] {
  let rows = loadDb().deals.slice();
  if (projectId) rows = rows.filter((d) => d.project_id === projectId);
  return rows.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

export function createReDeal(input: ReDealCreate): ReDeal {
  const db = loadDb();
  const project = db.projects.find((p) => p.id === input.project_id);
  if (!project) throw new Error("project_id not found");
  const ts = now();
  const status = input.status || "reserved";
  const row: ReDeal = {
    id: uid("re_deal"),
    project_id: project.id,
    project_name: project.name,
    lead_id: input.lead_id?.trim() || undefined,
    buyer_name: input.buyer_name.trim(),
    unit_label: (input.unit_label || "").trim() || "TBD",
    value: Math.max(0, Number(input.value ?? 0)),
    currency: (input.currency || project.currency || "BDT").trim(),
    ad_spend: Math.max(0, Number(input.ad_spend ?? 0)),
    status,
    closed_at:
      status === "closed"
        ? input.closed_at?.trim() || ts.slice(0, 10)
        : input.closed_at?.trim() || undefined,
    created_at: ts,
    updated_at: ts,
  };
  if (status === "closed" || status === "agreement" || status === "booking") {
    project.units_available = Math.max(0, project.units_available - 1);
    project.updated_at = ts;
  }
  if (input.lead_id) {
    const lead = db.leads.find((l) => l.id === input.lead_id);
    if (lead && (status === "closed" || status === "agreement")) {
      lead.status = "won";
      lead.updated_at = ts;
    }
  }
  db.deals.unshift(row);
  saveDb(db);
  return row;
}

export function reAnalytics(): ReAnalytics {
  const db = loadDb();
  const clients_active = db.clients.filter((c) => c.status === "active").length;
  const projects_live = db.projects.filter((p) =>
    ["pre_launch", "under_construction", "ready"].includes(p.status)
  ).length;
  const openStatuses = new Set(["new", "contacted", "qualified", "site_visit", "negotiation"]);
  const leads_open = db.leads.filter((l) => openStatuses.has(l.status)).length;
  const leads_won = db.leads.filter((l) => l.status === "won").length;
  const pipeline_value = db.deals
    .filter((d) => ["reserved", "booking", "agreement"].includes(d.status))
    .reduce((s, d) => s + d.value, 0);
  const closed = db.deals.filter((d) => d.status === "closed");
  const closed_value = closed.reduce((s, d) => s + d.value, 0);
  const ad_spend_total = db.deals.reduce((s, d) => s + d.ad_spend, 0);
  const roi_pct =
    ad_spend_total > 0
      ? Math.round(((closed_value - ad_spend_total) / ad_spend_total) * 1000) / 10
      : closed_value > 0
        ? 100
        : 0;
  const totalLeads = db.leads.length || 1;
  const cpl =
    db.leads.length > 0
      ? Math.round((ad_spend_total / db.leads.length) * 100) / 100
      : 0;
  const conversion_rate_pct =
    Math.round((leads_won / totalLeads) * 1000) / 10;

  const channels = new Map<string, { leads: number; won: number }>();
  for (const lead of db.leads) {
    const cur = channels.get(lead.channel) || { leads: 0, won: 0 };
    cur.leads += 1;
    if (lead.status === "won") cur.won += 1;
    channels.set(lead.channel, cur);
  }

  const by_project = db.projects.map((p) => ({
    project_id: p.id,
    project_name: p.name,
    leads: db.leads.filter((l) => l.project_id === p.id).length,
    available_units: p.units_available,
    closed_value: db.deals
      .filter((d) => d.project_id === p.id && d.status === "closed")
      .reduce((s, d) => s + d.value, 0),
  }));

  return {
    clients_active,
    projects_live,
    leads_open,
    leads_won,
    pipeline_value,
    closed_value,
    ad_spend_total,
    roi_pct,
    cpl,
    conversion_rate_pct,
    by_channel: [...channels.entries()].map(([channel, v]) => ({
      channel,
      ...v,
    })),
    by_project,
  };
}

export function getRealEstateHubSnapshot() {
  return {
    clients: listReClients(),
    projects: listReProjects(),
    leads: listReLeads(),
    deals: listReDeals(),
    analytics: reAnalytics(),
  };
}
