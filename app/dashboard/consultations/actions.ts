"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfile } from "@/lib/auth";

function toInt(v: FormDataEntryValue | null): number | null {
  const n = parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}
function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}
function uuid(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

export async function createConsultation(_prev: unknown, formData: FormData) {
  const profile = await requireActiveProfile();
  const supabase = await createClient();

  const clientEmail = str(formData.get("client_email"));
  const applicantName = str(formData.get("applicant_name"));
  if (!clientEmail) return { error: "Client email is required." };
  if (!applicantName) return { error: "Applicant name is required." };

  const p1 = uuid(formData.get("pathway_id_1"));
  const p2 = uuid(formData.get("pathway_id_2"));
  if (p2 && p2 === p1)
    return { error: "Please choose two different programs." };

  const { data: consultation, error } = await supabase
    .from("consultations")
    .insert({
      consultant_id: profile.id,
      client_email: clientEmail,
      applicant_name: applicantName,
      applicant_age: toInt(formData.get("applicant_age")),
      applicant_background: str(formData.get("applicant_background")),
      spouse_name: str(formData.get("spouse_name")),
      spouse_age: toInt(formData.get("spouse_age")),
      spouse_background: str(formData.get("spouse_background")),
      pathway_id_1: p1,
      pathway_id_2: p2,
      country_id: uuid(formData.get("country_id")),
      city_id: uuid(formData.get("city_id")),
      language_id: uuid(formData.get("language_id")),
    })
    .select("id")
    .single();

  if (error || !consultation)
    return { error: error?.message || "Could not save consultation." };

  // Children come through as a JSON array.
  try {
    const raw = String(formData.get("children") || "[]");
    const kids = JSON.parse(raw) as Array<{
      name?: string;
      age?: string | number;
      background?: string;
    }>;
    const rows = kids
      .filter((k) => k && String(k.name || "").trim())
      .map((k, i) => ({
        consultation_id: consultation.id,
        name: String(k.name).trim(),
        age:
          k.age === "" || k.age == null ? null : Number.parseInt(String(k.age), 10),
        background: k.background?.trim() || null,
        sort_order: i,
      }));
    if (rows.length) {
      await supabase.from("children").insert(rows);
    }
  } catch {
    // Bad children payload shouldn't lose the consultation.
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/consultations/${consultation.id}`);
}

export async function deleteConsultation(id: string) {
  await requireActiveProfile();
  const supabase = await createClient();
  await supabase.from("consultations").delete().eq("id", id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
