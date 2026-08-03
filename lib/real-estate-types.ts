/** FAOS Real Estate & PropTech Hub — developer/agency CRM + lifecycle + leads + ROI */

export type ReClientType = "developer" | "agency" | "broker" | "investor";
export type ReClientStatus = "active" | "prospect" | "paused";
export type ReProjectStatus =
  | "planning"
  | "pre_launch"
  | "under_construction"
  | "ready"
  | "sold_out";
export type ReLeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "site_visit"
  | "negotiation"
  | "won"
  | "lost";
export type ReLeadChannel =
  | "facebook"
  | "google"
  | "tiktok"
  | "referral"
  | "walk_in"
  | "organic"
  | "other";
export type ReDealStatus = "reserved" | "booking" | "agreement" | "closed" | "cancelled";

export type ReClient = {
  id: string;
  name: string;
  type: ReClientType;
  contact_name: string;
  email: string;
  phone: string;
  city: string;
  focus: string;
  status: ReClientStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type ReProject = {
  id: string;
  client_id: string;
  client_name: string;
  name: string;
  location: string;
  asset_type: string;
  units_total: number;
  units_available: number;
  price_from: number;
  currency: string;
  status: ReProjectStatus;
  showcase_url?: string;
  highlight?: string;
  created_at: string;
  updated_at: string;
};

export type ReLead = {
  id: string;
  project_id: string;
  project_name: string;
  client_id: string;
  name: string;
  phone: string;
  email?: string;
  channel: ReLeadChannel;
  campaign?: string;
  budget?: number;
  status: ReLeadStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type ReDeal = {
  id: string;
  project_id: string;
  project_name: string;
  lead_id?: string;
  buyer_name: string;
  unit_label: string;
  value: number;
  currency: string;
  ad_spend: number;
  status: ReDealStatus;
  closed_at?: string;
  created_at: string;
  updated_at: string;
};

export type ReAnalytics = {
  clients_active: number;
  projects_live: number;
  leads_open: number;
  leads_won: number;
  pipeline_value: number;
  closed_value: number;
  ad_spend_total: number;
  roi_pct: number;
  cpl: number;
  conversion_rate_pct: number;
  by_channel: Array<{ channel: string; leads: number; won: number }>;
  by_project: Array<{
    project_id: string;
    project_name: string;
    leads: number;
    available_units: number;
    closed_value: number;
  }>;
};

export type ReClientCreate = {
  name: string;
  type?: ReClientType;
  contact_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  focus?: string;
  status?: ReClientStatus;
  notes?: string;
};

export type ReProjectCreate = {
  client_id: string;
  name: string;
  location?: string;
  asset_type?: string;
  units_total?: number;
  units_available?: number;
  price_from?: number;
  currency?: string;
  status?: ReProjectStatus;
  showcase_url?: string;
  highlight?: string;
};

export type ReLeadCreate = {
  project_id: string;
  name: string;
  phone?: string;
  email?: string;
  channel?: ReLeadChannel;
  campaign?: string;
  budget?: number;
  status?: ReLeadStatus;
  notes?: string;
};

export type ReDealCreate = {
  project_id: string;
  lead_id?: string;
  buyer_name: string;
  unit_label?: string;
  value?: number;
  currency?: string;
  ad_spend?: number;
  status?: ReDealStatus;
  closed_at?: string;
};
