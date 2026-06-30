export type Role = "admin" | "consultant";
export type AccountStatus = "pending" | "active" | "disabled";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  status: AccountStatus;
  created_at: string;
};

export type Pathway = {
  id: string;
  name: string;
  description: string | null;
  requirements: string | null;
  talking_points: string | null;
  prompt: string | null; // custom AI instructions for writing this pathway's slides
  active: boolean;
  created_at: string;
};

export type Country = {
  id: string;
  name: string;
  created_at: string;
};

export type City = {
  id: string;
  country_id: string;
  name: string;
  created_at: string;
};

export type Language = {
  id: string;
  name: string;
  rtl: boolean;
  active: boolean;
  created_at: string;
};

export type Child = {
  id?: string;
  consultation_id?: string;
  name: string;
  age: number | null;
  background: string | null; // schooling / interests / opportunities notes
};

export type DeckStatus = "draft" | "generating" | "ready" | "error";

export type OdooUserMap = {
  id: string;
  odoo_user_id: number;
  odoo_user_name: string;
  consultant_id: string | null;
  created_at: string;
};

export type OdooTagCountryMap = {
  id: string;
  odoo_tag_id: number;
  odoo_tag_name: string;
  country_id: string | null;
  created_at: string;
};

export type OdooConfig = {
  id: number;
  source_stage_id: number | null;
  source_stage_name: string | null;
  enabled: boolean;
  last_synced_at: string | null;
  last_sync_result: string | null;
};

export type Deck = {
  id: string;
  consultation_id: string;
  storage_path: string;
  url: string | null;
  language: string | null;
  created_by: string | null;
  created_at: string;
};

export type Consultation = {
  id: string;
  consultant_id: string;
  client_email: string;
  applicant_name: string;
  applicant_age: number | null;
  applicant_background: string | null;
  spouse_name: string | null;
  spouse_age: number | null;
  spouse_background: string | null;
  pathway_id_1: string | null;
  pathway_id_2: string | null;
  country_id: string | null;
  city_id: string | null;
  language_id: string | null;
  odoo_lead_id: number | null;
  source: "manual" | "odoo";
  deck_status: DeckStatus;
  deck_url: string | null;
  deck_error: string | null;
  created_at: string;
};
