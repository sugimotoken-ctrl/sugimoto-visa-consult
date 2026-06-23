import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PathwayManager } from "@/components/admin/PathwayManager";

export default async function AdminPathwaysPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("pathways")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 font-serif text-2xl text-[var(--navy)]">Pathways</h1>
      <p className="mb-6 text-sm text-[var(--slate)]">
        Programs consultants can select. Descriptions and talking points feed the
        AI when generating client presentations.
      </p>
      <PathwayManager pathways={data ?? []} />
    </div>
  );
}
