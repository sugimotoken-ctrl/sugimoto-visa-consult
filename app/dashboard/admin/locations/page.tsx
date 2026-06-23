import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { LocationManager } from "@/components/admin/LocationManager";

export default async function AdminLocationsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: countries }, { data: cities }] = await Promise.all([
    supabase.from("countries").select("*").order("name"),
    supabase.from("cities").select("*").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 font-serif text-2xl text-[var(--navy)]">Locations</h1>
      <p className="mb-6 text-sm text-[var(--slate)]">
        Countries and cities available in the consultation form. City is optional
        for consultants.
      </p>
      <LocationManager countries={countries ?? []} cities={cities ?? []} />
    </div>
  );
}
