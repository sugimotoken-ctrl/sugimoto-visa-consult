import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import {
  odooConfigured,
  testConnection,
  getStages,
  getTags,
  type OdooStage,
  type OdooTag,
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

  if (configured) {
    connection = await testConnection();
    if (connection.ok) {
      try {
        [stages, tags] = await Promise.all([getStages(), getTags()]);
      } catch (e) {
        connection = {
          ok: false,
          error: e instanceof Error ? e.message : "Odoo read failed.",
        };
      }
    }
  }

  const [{ data: config }, { data: tagMap }, { data: consultants }] =
    await Promise.all([
      supabase.from("odoo_config").select("*").eq("id", 1).single(),
      supabase.from("odoo_tag_map").select("odoo_tag_id, consultant_id"),
      supabase
        .from("profiles")
        .select("*")
        .eq("status", "active")
        .order("full_name"),
    ]);

  const mappings: Record<number, string> = {};
  (tagMap ?? []).forEach((m) => {
    if (m.consultant_id) mappings[Number(m.odoo_tag_id)] = m.consultant_id;
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 font-serif text-2xl text-[var(--navy)]">
        Odoo CRM sync
      </h1>
      <p className="mb-6 text-sm text-[var(--slate)]">
        Import client cards from your Odoo pipeline as draft consultations,
        routed to consultants by Odoo tag. Read-only — nothing is written back to
        Odoo.
      </p>
      <OdooManager
        configured={configured}
        connection={connection}
        stages={stages}
        tags={tags}
        consultants={consultants ?? []}
        config={config ?? null}
        mappings={mappings}
      />
    </div>
  );
}
