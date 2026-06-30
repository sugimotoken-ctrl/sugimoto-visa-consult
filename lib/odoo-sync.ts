// Core Odoo import logic, shared by the admin "Sync now" action and the cron job.
// Server-only (uses the service-role client + Odoo creds).
import { createAdminClient } from "@/lib/supabase/server";
import { getLeadsInStage, odooConfigured, type OdooLead } from "@/lib/odoo";

function str(v: string | false | null | undefined): string | null {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}
function stripHtml(v: string | false | null | undefined): string | null {
  const s = (v ?? "").toString();
  if (!s) return null;
  const out = s
    .replace(/<[^>]*>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return out.length ? out : null;
}

// Convert Persian/Arabic-Indic digits to ASCII.
function normalizeDigits(s: string): string {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  return s.replace(/[۰-۹٠-٩]/g, (d) => {
    const i = fa.indexOf(d);
    if (i > -1) return String(i);
    const j = ar.indexOf(d);
    return j > -1 ? String(j) : d;
  });
}

// Labels used in Sugimoto's Odoo lead intake (English labels, Persian values).
const INTAKE_LABELS = [
  "Name",
  "Age",
  "Nationality",
  "Passport",
  "Destination",
  "Immigration Path",
  "Education",
  "Major",
  "Language",
  "Employment Status",
  "Employment",
  "Budget",
  "Mobile",
  "Email",
  "Created_at",
];

export function parseIntake(description: string | false | null | undefined): {
  fields: Record<string, string>;
  age: number | null;
  background: string | null;
} {
  const text = stripHtml(description);
  if (!text) return { fields: {}, age: null, background: null };

  const esc = INTAKE_LABELS.map((l) =>
    l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  ).join("|");
  const re = new RegExp(`(${esc})\\s*[:：]\\s*([\\s\\S]*?)(?=(?:${esc})\\s*[:：]|$)`, "g");

  const fields: Record<string, string> = {};
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const key = m[1].trim();
    const val = m[2].replace(/\s+/g, " ").trim();
    if (val) fields[key] = val;
  }

  // No labelled structure → keep the cleaned text as the background.
  if (Object.keys(fields).length === 0) {
    return { fields: {}, age: null, background: text.replace(/\s+/g, " ").trim() };
  }

  let age: number | null = null;
  if (fields["Age"]) {
    const n = parseInt(normalizeDigits(fields["Age"]).replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n) && n > 0 && n < 120) age = n;
  }

  // Compose a readable educational/professional background for the AI.
  const order = [
    "Nationality",
    "Destination",
    "Immigration Path",
    "Education",
    "Major",
    "Language",
    "Employment Status",
    "Employment",
    "Budget",
  ];
  const background =
    order
      .filter((k) => fields[k])
      .map((k) => `${k}: ${fields[k]}`)
      .join("\n") || null;

  return { fields, age, background };
}

export type SyncResult = {
  ok?: boolean;
  error?: string;
  created?: number;
  skippedExisting?: number;
  skippedUnmapped?: number;
  total?: number;
};

export async function performOdooSync(): Promise<SyncResult> {
  if (!odooConfigured()) {
    return { error: "Odoo credentials are not set on the server." };
  }
  const admin = createAdminClient();

  const { data: config } = await admin
    .from("odoo_config")
    .select("source_stage_id")
    .eq("id", 1)
    .single();
  const stageId = config?.source_stage_id;
  if (!stageId) return { error: "Choose a source stage before syncing." };

  let leads: OdooLead[];
  try {
    leads = await getLeadsInStage(Number(stageId));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Odoo read failed.";
    await admin
      .from("odoo_config")
      .update({ last_sync_result: `Error: ${msg}` })
      .eq("id", 1);
    return { error: msg };
  }

  const [
    { data: userRows },
    { data: tagCountryRows },
    { data: countryRows },
    { data: existing },
  ] = await Promise.all([
    admin.from("odoo_user_map").select("odoo_user_id, consultant_id"),
    admin.from("odoo_tag_country_map").select("odoo_tag_id, country_id"),
    admin.from("countries").select("id, name"),
    admin
      .from("consultations")
      .select("odoo_lead_id")
      .not("odoo_lead_id", "is", null),
  ]);

  const userToConsultant = new Map<number, string>();
  (userRows ?? []).forEach((u) => {
    if (u.consultant_id)
      userToConsultant.set(Number(u.odoo_user_id), u.consultant_id);
  });
  const tagToCountry = new Map<number, string>();
  (tagCountryRows ?? []).forEach((t) => {
    if (t.country_id) tagToCountry.set(Number(t.odoo_tag_id), t.country_id);
  });
  const countryByName = new Map<string, string>();
  (countryRows ?? []).forEach((c) =>
    countryByName.set(c.name.toLowerCase(), c.id)
  );
  const existingLeadIds = new Set(
    (existing ?? []).map((e) => Number(e.odoo_lead_id))
  );

  let created = 0;
  let skippedExisting = 0;
  let skippedUnmapped = 0;
  const newRows: Record<string, unknown>[] = [];

  for (const lead of leads) {
    if (existingLeadIds.has(lead.id)) {
      skippedExisting++;
      continue;
    }
    const odooUserId = Array.isArray(lead.user_id) ? lead.user_id[0] : null;
    const consultantId = odooUserId
      ? userToConsultant.get(odooUserId)
      : undefined;
    if (!consultantId) {
      skippedUnmapped++;
      continue;
    }

    // Destination country: mapped tag first, else Odoo country by name.
    let countryId: string | null = null;
    for (const tagId of lead.tag_ids || []) {
      const mapped = tagToCountry.get(tagId);
      if (mapped) {
        countryId = mapped;
        break;
      }
    }
    if (!countryId && Array.isArray(lead.country_id)) {
      countryId = countryByName.get(lead.country_id[1].toLowerCase()) ?? null;
    }

    // Parse the structured intake from the lead description.
    const parsed = parseIntake(lead.description);
    const phone = str(lead.phone) || str(lead.mobile);
    const background =
      [parsed.background, phone ? `Phone: ${phone}` : null]
        .filter(Boolean)
        .join("\n") || null;

    newRows.push({
      consultant_id: consultantId,
      client_email: str(lead.email_from) || str(parsed.fields["Email"]) || "",
      applicant_name:
        str(lead.contact_name) ||
        str(parsed.fields["Name"]) ||
        str(lead.partner_name) ||
        str(lead.name) ||
        "Unnamed",
      applicant_age: parsed.age,
      applicant_background: background,
      country_id: countryId,
      odoo_lead_id: lead.id,
      source: "odoo",
      deck_status: "draft",
    });
  }

  if (newRows.length) {
    const { error, count } = await admin
      .from("consultations")
      .insert(newRows, { count: "exact" });
    if (error) {
      await admin
        .from("odoo_config")
        .update({ last_sync_result: `Insert error: ${error.message}` })
        .eq("id", 1);
      return { error: error.message };
    }
    created = count ?? newRows.length;
  }

  const summary = `Imported ${created} new · ${skippedExisting} already imported · ${skippedUnmapped} skipped (salesperson not mapped) · ${leads.length} cards in stage`;
  await admin
    .from("odoo_config")
    .update({
      last_synced_at: new Date().toISOString(),
      last_sync_result: summary,
    })
    .eq("id", 1);

  return { ok: true, created, skippedExisting, skippedUnmapped, total: leads.length };
}
