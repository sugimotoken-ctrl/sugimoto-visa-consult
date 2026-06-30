import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfile } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";

export default async function ConsultationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const profile = await requireActiveProfile();
  const supabase = await createClient();

  const rawQ = (await searchParams).q?.trim() ?? "";
  // Strip characters that would break PostgREST's or() filter syntax.
  const q = rawQ.replace(/[,()%*]/g, " ").trim();

  // RLS scopes this to the consultant's own rows (admins see all).
  let query = supabase
    .from("consultations")
    .select(
      "id, client_email, applicant_name, spouse_name, created_at, deck_status, consultant_id, countries(name), p1:pathways!consultations_pathway_id_1_fkey(name)"
    )
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(
      `applicant_name.ilike.%${q}%,client_email.ilike.%${q}%,spouse_name.ilike.%${q}%`
    );
  }

  const { data: consultations } = await query;
  const rows = consultations ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-[var(--navy)]">
            Consultations
          </h1>
          <p className="text-sm text-[var(--slate)]">
            {profile.role === "admin"
              ? "All consultations across the team."
              : "Your client consultations and generated presentations."}
          </p>
        </div>
        <Link href="/dashboard/consultations/new" className="btn-accent">
          + New consultation
        </Link>
      </div>

      <form method="get" className="mb-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by applicant, client email, or spouse…"
          className="field max-w-md"
        />
        <button type="submit" className="btn-primary">
          Search
        </button>
        {q && (
          <Link href="/dashboard" className="btn-ghost">
            Clear
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          {q ? (
            <>
              <p className="text-[var(--slate)]">
                No consultations match &ldquo;{q}&rdquo;.
              </p>
              <Link href="/dashboard" className="btn-ghost">
                Clear search
              </Link>
            </>
          ) : (
            <>
              <p className="text-[var(--slate)]">No consultations yet.</p>
              <Link
                href="/dashboard/consultations/new"
                className="btn-primary"
              >
                Create your first consultation
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--cream)] text-left text-xs uppercase tracking-wide text-[var(--slate)]">
              <tr>
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Client email</th>
                <th className="px-4 py-3">Pathway</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Deck</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr
                  key={r.id}
                  className="border-t border-[var(--border)] hover:bg-[var(--cream)]/50"
                >
                  <td className="px-4 py-3 font-medium text-[var(--navy)]">
                    {r.applicant_name}
                  </td>
                  <td className="px-4 py-3 text-[var(--slate)]">
                    {r.client_email}
                  </td>
                  <td className="px-4 py-3 text-[var(--slate)]">
                    {r.p1?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--slate)]">
                    {r.countries?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.deck_status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/consultations/${r.id}`}
                      className="font-semibold text-[var(--navy)] underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
