import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfile } from "@/lib/auth";
import { DeckPanel } from "@/components/DeckPanel";

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[var(--slate)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-[var(--foreground)]">{value || "—"}</dd>
    </div>
  );
}

export default async function ConsultationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireActiveProfile();
  const supabase = await createClient();

  const { data: c } = await supabase
    .from("consultations")
    .select(
      `*,
       countries(name),
       cities(name),
       languages(name),
       p1:pathways!consultations_pathway_id_1_fkey(name),
       p2:pathways!consultations_pathway_id_2_fkey(name),
       children(id, name, age, background, sort_order)`
    )
    .eq("id", id)
    .single();

  if (!c) notFound();

  const kids = (c.children ?? []).sort(
    (a: any, b: any) => a.sort_order - b.sort_order
  );

  // Full presentation history (every generated version).
  const { data: decks } = await supabase
    .from("decks")
    .select("id, url, language, created_at")
    .eq("consultation_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-[var(--slate)] hover:underline"
        >
          ← Back to consultations
        </Link>
        <h1 className="mt-2 font-serif text-2xl text-[var(--navy)]">
          {c.applicant_name}
        </h1>
        <p className="text-sm text-[var(--slate)]">{c.client_email}</p>
      </div>

      <DeckPanel
        consultationId={c.id}
        status={c.deck_status}
        deckUrl={c.deck_url}
        deckError={c.deck_error}
      />

      {decks && decks.length > 0 && (
        <div className="card p-6">
          <h2 className="font-serif text-lg text-[var(--navy)]">
            Presentation history
          </h2>
          <p className="mt-1 text-sm text-[var(--slate)]">
            Every generated version is kept. The newest is also available above.
          </p>
          <ul className="mt-4 divide-y divide-[var(--border)]">
            {decks.map((d: any, i: number) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <span className="font-medium text-[var(--navy)]">
                    {i === 0 ? "Latest" : `Version ${decks.length - i}`}
                  </span>
                  <span className="ml-2 text-[var(--slate)]">
                    {new Date(d.created_at).toLocaleString()}
                    {d.language ? ` · ${d.language}` : ""}
                  </span>
                </div>
                {d.url ? (
                  <a
                    href={d.url}
                    download
                    className="font-semibold text-[var(--navy)] underline"
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-[var(--slate)]">unavailable</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-serif text-lg text-[var(--navy)]">
          Destination & programs
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Detail label="Program 1" value={c.p1?.name} />
          <Detail label="Program 2" value={c.p2?.name} />
          <Detail label="Country" value={c.countries?.name} />
          <Detail label="City" value={c.cities?.name} />
          <Detail label="Presentation language" value={c.languages?.name} />
        </dl>
      </div>

      <div className="card p-6">
        <h2 className="font-serif text-lg text-[var(--navy)]">Main applicant</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Detail label="Name" value={c.applicant_name} />
          <Detail
            label="Age"
            value={c.applicant_age != null ? String(c.applicant_age) : null}
          />
        </dl>
        <div className="mt-4">
          <Detail label="Background" value={c.applicant_background} />
        </div>
      </div>

      {(c.spouse_name || c.spouse_background) && (
        <div className="card p-6">
          <h2 className="font-serif text-lg text-[var(--navy)]">
            Partner / spouse
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail label="Name" value={c.spouse_name} />
            <Detail
              label="Age"
              value={c.spouse_age != null ? String(c.spouse_age) : null}
            />
          </dl>
          <div className="mt-4">
            <Detail label="Background" value={c.spouse_background} />
          </div>
        </div>
      )}

      {kids.length > 0 && (
        <div className="card p-6">
          <h2 className="font-serif text-lg text-[var(--navy)]">Children</h2>
          <div className="mt-4 space-y-4">
            {kids.map((k: any) => (
              <div
                key={k.id}
                className="rounded-lg border border-[var(--border)] p-4"
              >
                <div className="font-medium text-[var(--navy)]">
                  {k.name}
                  {k.age != null && (
                    <span className="ml-2 text-sm font-normal text-[var(--slate)]">
                      age {k.age}
                    </span>
                  )}
                </div>
                {k.background && (
                  <p className="mt-1 text-sm text-[var(--slate)]">
                    {k.background}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
