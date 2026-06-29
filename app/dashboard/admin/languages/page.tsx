import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { LanguageManager } from "@/components/admin/LanguageManager";

export default async function AdminLanguagesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("languages")
    .select("*")
    .order("name");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 font-serif text-2xl text-[var(--navy)]">Languages</h1>
      <p className="mb-6 text-sm text-[var(--slate)]">
        Languages consultants can generate presentations in.
      </p>
      <LanguageManager languages={data ?? []} />
    </div>
  );
}
