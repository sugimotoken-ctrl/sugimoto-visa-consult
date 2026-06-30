"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { performOdooSync } from "@/lib/odoo-sync";

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

// ---- Run the import (admin-triggered) ----
export async function runOdooSync() {
  await requireAdmin();
  const result = await performOdooSync();
  revalidatePath("/dashboard/admin/odoo");
  revalidatePath("/dashboard");
  return result;
}
