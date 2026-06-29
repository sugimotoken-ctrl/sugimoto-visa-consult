"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// ---------- Pathways ----------
export async function createPathway(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Pathway name is required." };
  const { error } = await supabase.from("pathways").insert({
    name,
    description: String(formData.get("description") || "").trim() || null,
    requirements: String(formData.get("requirements") || "").trim() || null,
    talking_points: String(formData.get("talking_points") || "").trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/pathways");
  return { ok: true };
}

export async function togglePathway(id: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("pathways").update({ active }).eq("id", id);
  revalidatePath("/dashboard/admin/pathways");
}

export async function deletePathway(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("pathways").delete().eq("id", id);
  revalidatePath("/dashboard/admin/pathways");
}

// ---------- Countries & cities ----------
export async function createCountry(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Country name is required." };
  const { error } = await supabase.from("countries").insert({ name });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/locations");
  return { ok: true };
}

export async function deleteCountry(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("countries").delete().eq("id", id);
  revalidatePath("/dashboard/admin/locations");
}

export async function createCity(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const name = String(formData.get("name") || "").trim();
  const country_id = String(formData.get("country_id") || "").trim();
  if (!name || !country_id)
    return { error: "City name and country are required." };
  const { error } = await supabase.from("cities").insert({ name, country_id });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/locations");
  return { ok: true };
}

export async function deleteCity(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("cities").delete().eq("id", id);
  revalidatePath("/dashboard/admin/locations");
}

// ---------- Languages ----------
export async function createLanguage(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Language name is required." };
  const rtl = formData.get("rtl") === "on";
  const { error } = await supabase.from("languages").insert({ name, rtl });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/languages");
  return { ok: true };
}

export async function toggleLanguage(id: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("languages").update({ active }).eq("id", id);
  revalidatePath("/dashboard/admin/languages");
}

export async function deleteLanguage(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("languages").delete().eq("id", id);
  revalidatePath("/dashboard/admin/languages");
}

// ---------- Consultants ----------
export async function setConsultantStatus(
  id: string,
  status: "active" | "disabled" | "pending"
) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("profiles").update({ status }).eq("id", id);
  // Activating a consultant also confirms their email, so they can sign in
  // immediately regardless of Supabase's "Confirm email" setting.
  if (status === "active") {
    try {
      const adminDb = createAdminClient();
      await adminDb.auth.admin.updateUserById(id, { email_confirm: true });
    } catch (e) {
      console.error("Failed to auto-confirm email on activation:", e);
    }
  }
  revalidatePath("/dashboard/admin/consultants");
}

export async function setConsultantRole(
  id: string,
  role: "admin" | "consultant"
) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", id);
  revalidatePath("/dashboard/admin/consultants");
}

export async function deleteConsultant(id: string) {
  const admin = await requireAdmin();
  if (admin.id === id) return; // never delete yourself
  // Removing the auth user cascades to the profile and their consultations.
  const adminDb = createAdminClient();
  await adminDb.auth.admin.deleteUser(id);
  revalidatePath("/dashboard/admin/consultants");
}
