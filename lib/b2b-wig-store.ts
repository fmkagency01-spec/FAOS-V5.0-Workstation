import fs from "fs";
import path from "path";
import seedDb from "@/data/fmk_wig_b2b_db.json";
import rrSeedDb from "@/data/rr_wigs_workspace_db.json";
import migration001 from "@/data/migrations/001_fmk_wig_b2b_schema.json";
import migration002 from "@/data/migrations/002_rr_wigs_tenant_schema.json";

export type B2bLead = (typeof seedDb.b2b_leads)[number];
export type SalonOrder = (typeof seedDb.salon_orders)[number];
export type GlobalBuyer = (typeof seedDb.global_buyers)[number];
export type ExportCatalogItem = (typeof seedDb.export_catalog)[number];

export type RrWebAnalytics = (typeof rrSeedDb.web_analytics)[number];
export type RrAdSpend = (typeof rrSeedDb.ad_spend)[number];
export type RrLinkedinLead = (typeof rrSeedDb.linkedin_leads)[number];
export type RrSeoRanking = (typeof rrSeedDb.seo_rankings)[number];
export type RrFactoryInventory = (typeof rrSeedDb.factory_inventory)[number];
export type RrB2bInquiry = (typeof rrSeedDb.b2b_inquiries)[number];

type FmkWigDb = typeof seedDb;
type RrWigsDb = typeof rrSeedDb;

function dataDir(): string {
  const preferred = path.join(process.cwd(), "data");
  if (fs.existsSync(preferred)) return preferred;
  return path.join(process.cwd(), "backend", "data");
}

function readJson<T>(file: string, fallback: T): T {
  const full = path.join(dataDir(), file);
  if (!fs.existsSync(full)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(full, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown): void {
  const full = path.join(dataDir(), file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(data, null, 2), "utf-8");
}

export function getMigrations() {
  return [migration001, migration002];
}

export function loadFmkWigB2bDb(): FmkWigDb {
  return readJson("fmk_wig_b2b_db.json", seedDb);
}

export function saveFmkWigB2bDb(db: FmkWigDb): void {
  writeJson("fmk_wig_b2b_db.json", db);
}

export function loadRrWigsWorkspaceDb(): RrWigsDb {
  return readJson("rr_wigs_workspace_db.json", rrSeedDb);
}

export function saveRrWigsWorkspaceDb(db: RrWigsDb): void {
  writeJson("rr_wigs_workspace_db.json", db);
}

export function addB2bLead(lead: Omit<B2bLead, "id" | "created_at" | "updated_at">): B2bLead {
  const db = loadFmkWigB2bDb();
  const record: B2bLead = {
    ...lead,
    id: `lead_fmk_${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.b2b_leads = [record, ...db.b2b_leads];
  saveFmkWigB2bDb(db);
  return record;
}

export function addRrInquiry(
  inquiry: Omit<RrB2bInquiry, "id" | "created_at" | "status">
): RrB2bInquiry {
  const db = loadRrWigsWorkspaceDb();
  const record: RrB2bInquiry = {
    ...inquiry,
    id: `inq_rr_${Date.now()}`,
    status: "new",
    created_at: new Date().toISOString(),
  };
  db.b2b_inquiries = [record, ...db.b2b_inquiries];
  saveRrWigsWorkspaceDb(db);
  return record;
}

/** Sync RR Wigs factory inventory into FMK Wig export catalog (Agent Gamma). */
export function syncFactoryInventoryToFmk(): {
  synced: number;
  catalog_updates: ExportCatalogItem[];
} {
  const rr = loadRrWigsWorkspaceDb();
  const fmk = loadFmkWigB2bDb();
  const now = new Date().toISOString();
  const updates: ExportCatalogItem[] = [];

  for (const item of rr.factory_inventory) {
    const mappedSku = item.sku.replace(/^RR-/, "FMK-RR-");
    const existing = fmk.export_catalog.find((c) => c.sku === mappedSku);
    if (existing) {
      existing.stock_units = item.units_on_hand;
    } else {
      const entry: ExportCatalogItem = {
        sku: mappedSku,
        name: `${item.product_name} (RR Partner)`,
        category: "prosthetic_hair",
        moq: 10,
        unit_price_usd: 95,
        stock_units: item.units_on_hand,
        origin: "Bangladesh (RR Factory)",
      };
      fmk.export_catalog.push(entry);
      updates.push(entry);
    }
    item.synced_to_fmk = true;
    item.last_sync_at = now;
  }

  saveFmkWigB2bDb(fmk);
  saveRrWigsWorkspaceDb(rr);
  return { synced: rr.factory_inventory.length, catalog_updates: updates };
}

export function fmkWigB2bSummary() {
  const db = loadFmkWigB2bDb();
  return {
    brain_node: db.brain_node,
    leads_total: db.b2b_leads.length,
    orders_active: db.salon_orders.filter((o) => o.status !== "completed").length,
    buyers_total: db.global_buyers.length,
    export_skus: db.export_catalog.length,
    import_skus: db.import_catalog.length,
  };
}

export function rrWigsWorkspaceSummary() {
  const db = loadRrWigsWorkspaceDb();
  return {
    brain_node: db.brain_node,
    tenant_id: db.tenant_id,
    client_id: db.client_id,
    sessions_mtd: db.web_analytics[0]?.sessions ?? 0,
    ad_spend_mtd: db.ad_spend.reduce((s, a) => s + a.spend_usd, 0),
    linkedin_leads: db.linkedin_leads.length,
    seo_keywords: db.seo_rankings.length,
    factory_skus: db.factory_inventory.length,
    open_inquiries: db.b2b_inquiries.filter((i) => i.status === "new").length,
  };
}
