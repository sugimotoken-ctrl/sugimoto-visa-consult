import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import {
  odooConfigured,
  testConnection,
  getStages,
  getTags,
  getSalespeople,
  type OdooStage,
  type OdooTag,
  type OdooSalesperson,
} from "@/lib/odoo";
import { OdooManager } from "@/components/admin/OdooManager";

export const dynamic = "force-dynamic";

export default async function AdminOdooPage() {
  await requireAdmin();
  const supabase = await createClient();

  const configured = odooConfigured();
  let connection: { ok: boolean; error?: string } = {
    ok: false,
    error: "Not configured",
  };
  let stages: OdooStage[] = [];
  let tags: OdooTag[] = [];
  let salespeople: OdooSalesperson[] = [];

  if (configured) {
    connection = await testConnection();
    if (connection.ok) {
      try {
        [stages, tags, salespeople] = await Promise.all([
          getStages(),
          getTags(),
          getSalespeople(),
        ]);
      } catch (e) {
        connection = {
          ok: false,
          error: e instanceof Error ? e.message : "Odoo read failed.",
        };
      }
    }
  }

  const [
    { data: config },
    { data: userMap },
    { data: tagCountryMap },
    { data: consultants },
    { data: countries },
  ] = await Promise.all([
    supabase.from("odoo_config").select("*").eq("id", 1).single(),
    supabase.from("odoo_user_map").select("odoo_user_id, consultant_id"),
    supabase.from("odoo_tag_country_map").select("odoo_tag_id, country_id"),
    supabase
      .from("profiles")
      .select("*")
      .eq("status", "active")
      .order("full_name"),
    supabase.from("countries").select("*").order("name"),
  ]);

  const userMappings: Record<number, string> = {};
  (userMap ?? []).forEach((m) => {
    if (m.consultant_id) userMappings[Number(m.odoo_user_id)] = m.consultant_id;
  });
  const countryMappings: Record<number, string> = {};
  (tagCountryMap ?? []).forEach((m) => {
    if (m.country_id) countryMappings[Number(m.odoo_tag_id)] = m.country_id;
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 font-serif text-2xl text-[var(--navy)]">
        Odoo CRM sync
      </h1>
      <p className="mb-6 text-sm text-[var(--slate)]">
        Import client cards from your Odoo pipeline as draft consultations,
        routed to consultants by Odoo Salesperson. Read-only — nothing is written
        back to Odoo.
      </p>
      <OdooManager
        configured={configured}
        connection={connection}
        stages={stages}
        tags={tags}
        salespeople={salespeople}
        consultants={consultants ?? []}
        countries={countries ?? []}
        config={config ?? null}
        userMappings={userMappings}
        countryMappings={countryMappings}
      />
    </div>
  );
}
