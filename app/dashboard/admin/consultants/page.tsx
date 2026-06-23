import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { ConsultantManager } from "@/components/admin/ConsultantManager";

export default async function AdminConsultantsPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 font-serif text-2xl text-[var(--navy)]">Consultants</h1>
      <p className="mb-6 text-sm text-[var(--slate)]">
        Approve new sign-ups, disable access, change roles, or remove accounts.
      </p>
      <ConsultantManager profiles={data ?? []} currentUserId={admin.id} />
    </div>
  );
}
