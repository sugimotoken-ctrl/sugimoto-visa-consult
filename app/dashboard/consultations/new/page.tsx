import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfile } from "@/lib/auth";
import { ConsultationForm } from "@/components/ConsultationForm";

export default async function NewConsultationPage() {
  await requireActiveProfile();
  const supabase = await createClient();

  const [
    { data: pathways },
    { data: countries },
    { data: cities },
    { data: languages },
  ] = await Promise.all([
    supabase.from("pathways").select("*").eq("active", true).order("name"),
    supabase.from("countries").select("*").order("name"),
    supabase.from("cities").select("*").order("name"),
    supabase.from("languages").select("*").eq("active", true).order("name"),
  ]);

  const noRefData = !pathways?.length || !countries?.length || !languages?.length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-[var(--slate)] hover:underline"
        >
          ← Back to consultations
        </Link>
        <h1 className="mt-2 font-serif text-2xl text-[var(--navy)]">
          New consultation
        </h1>
        <p className="text-sm text-[var(--slate)]">
          Capture the consultation details. You&apos;ll generate the client
          presentation on the next screen.
        </p>
      </div>

      {noRefData ? (
        <div className="card p-6 text-sm text-[var(--slate)]">
          <p className="font-medium text-[var(--navy)]">
            Reference data is missing.
          </p>
          <p className="mt-1">
            An administrator needs to add at least one pathway, one country, and
            one language before consultations can be created.
          </p>
        </div>
      ) : (
        <ConsultationForm
          pathways={pathways!}
          countries={countries!}
          cities={cities ?? []}
          languages={languages!}
        />
      )}
    </div>
  );
}
