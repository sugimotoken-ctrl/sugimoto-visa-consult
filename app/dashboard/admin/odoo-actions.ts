"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import {
  getLeadsInStage,
  odooConfigured,
  type OdooLead,
} from "@/lib/odoo";

function str(v: string | false | null | undefined): string | null {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}
function stripHtml(v: string | false | null | undefined): string | null {
  const s = (v ?? "").toString();
  if (!s) return null;
  const out = s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return out.length ? out : null;
}

// ---- Config: choose the source stage ----
export async function saveOdooStage(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = formData.get("stage_id") ? Number(formData.get("stage_id")) : null;
  const name = String(formData.get("stage_name") || "").trim() || null;
  const { error } = await supabase
    .from("odoo_config")
    .update({ source_stage_id: id, source_stage_name: name })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/odoo");
  return { ok: true };
}

// ---- Salesperson → consultant mapping ----
export async function mapSalesperson(
  odooUserId: number,
  odooUserName: string,
  consultantId: string | null
) {
  await requireAdmin();
  const supabase = await createClient();
  if (!consultantId) {
    await supabase.from("odoo_user_map").delete().eq("odoo_user_id", odooUserId);
  } else {
    await supabase.from("odoo_user_map").upsert(
      {
        odoo_user_id: odooUserId,
        odoo_user_name: odooUserName,
        consultant_id: consultantId,
      },
      { onConflict: "odoo_user_id" }
    );
  }
  revalidatePath("/dashboard/admin/odoo");
}

// ---- Tag → destination country mapping ----
export async function mapTagCountry(
  odooTagId: number,
  odooTagName: string,
  countryId: string | null
) {
  await requireAdmin();
  const supabase = await createClient();
  if (!countryId) {
    await supabase
      .from("odoo_tag_country_map")
      .delete()
      .eq("odoo_tag_id", odooTagId);
  } else {
    await supabase.from("odoo_tag_country_map").upsert(
      {
        odoo_tag_id: odooTagId,
        odoo_tag_name: odooTagName,
        country_id: countryId,
      },
      { onConflict: "odoo_tag_id" }
    );
  }
  revalidatePath("/dashboard/admin/odoo");
}

// ---- Run the import ----
export async function runOdooSync() {
  await requireAdmin();
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
  if (!stageId) {
    return { error: "Choose a source stage before syncing." };
  }

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

  // Lookups: salesperson → consultant, tag → country, country name → id, existing leads.
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
    // Owner = the consultant mapped to this lead's Odoo Salesperson.
    const odooUserId = Array.isArray(lead.user_id) ? lead.user_id[0] : null;
    const consultantId = odooUserId
      ? userToConsultant.get(odooUserId)
      : undefined;
    if (!consultantId) {
      skippedUnmapped++;
      continue;
    }

    // Destination country: first from a mapped tag, else match Odoo country by name.
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

    const phone = str(lead.phone) || str(lead.mobile);
    const notes = stripHtml(lead.description);
    const background = [notes, phone ? `Phone: ${phone}` : null]
      .filter(Boolean)
      .join(" · ");

    newRows.push({
      consultant_id: consultantId,
      client_email: str(lead.email_from) || "",
      applicant_name:
        str(lead.contact_name) ||
        str(lead.partner_name) ||
        str(lead.name) ||
        "Unnamed",
      applicant_background: background || null,
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

  revalidatePath("/dashboard/admin/odoo");
  revalidatePath("/dashboard");
  return {
    ok: true,
    created,
    skippedExisting,
    skippedUnmapped,
    total: leads.length,
  };
}
