"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { createConsultation } from "@/app/dashboard/consultations/actions";
import type { City, Country, Language, Pathway } from "@/lib/types";

type Kid = { name: string; age: string; background: string };

export function ConsultationForm({
  pathways,
  countries,
  cities,
  languages,
}: {
  pathways: Pathway[];
  countries: Country[];
  cities: City[];
  languages: Language[];
}) {
  const [state, action, pending] = useActionState(createConsultation, null);
  const [countryId, setCountryId] = useState("");
  const [kids, setKids] = useState<Kid[]>([]);

  const cityOptions = useMemo(
    () => cities.filter((c) => c.country_id === countryId),
    [cities, countryId]
  );

  const addKid = () =>
    setKids((k) => [...k, { name: "", age: "", background: "" }]);
  const removeKid = (i: number) =>
    setKids((k) => k.filter((_, idx) => idx !== i));
  const updateKid = (i: number, patch: Partial<Kid>) =>
    setKids((k) => k.map((kid, idx) => (idx === i ? { ...kid, ...patch } : kid)));

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="children" value={JSON.stringify(kids)} />

      {/* Client + destination */}
      <section className="card p-6">
        <h2 className="font-serif text-lg text-[var(--navy)]">
          Client & destination
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="client_email">
              Client email *
            </label>
            <input
              id="client_email"
              name="client_email"
              type="email"
              className="field"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="pathway_id_1">
              Program 1 *
            </label>
            <select
              id="pathway_id_1"
              name="pathway_id_1"
              className="field"
              required
            >
              <option value="">Select a program…</option>
              {pathways.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pathway_id_2">
              Program 2 (optional)
            </label>
            <select id="pathway_id_2" name="pathway_id_2" className="field">
              <option value="">None</option>
              {pathways.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="country_id">
              Country *
            </label>
            <select
              id="country_id"
              name="country_id"
              className="field"
              required
              value={countryId}
              onChange={(e) => setCountryId(e.target.value)}
            >
              <option value="">Select a country…</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="city_id">
              City (optional)
            </label>
            <select
              id="city_id"
              name="city_id"
              className="field"
              disabled={!countryId}
            >
              <option value="">
                {countryId ? "Any / not specified" : "Select a country first"}
              </option>
              {cityOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="language_id">
              Presentation language *
            </label>
            <select
              id="language_id"
              name="language_id"
              className="field"
              required
              defaultValue={
                languages.find((l) => l.name.toLowerCase() === "english")?.id ??
                languages[0]?.id ??
                ""
              }
            >
              {languages.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {l.rtl ? " (RTL)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Main applicant */}
      <section className="card p-6">
        <h2 className="font-serif text-lg text-[var(--navy)]">Main applicant</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="applicant_name">
              Full name *
            </label>
            <input
              id="applicant_name"
              name="applicant_name"
              className="field"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="applicant_age">
              Age
            </label>
            <input
              id="applicant_age"
              name="applicant_age"
              type="number"
              min={0}
              className="field"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="label" htmlFor="applicant_background">
              Educational & professional background
            </label>
            <textarea
              id="applicant_background"
              name="applicant_background"
              rows={4}
              className="field"
              placeholder="Degrees, field of study, years of experience, occupation, skills, certifications…"
            />
          </div>
        </div>
      </section>

      {/* Spouse */}
      <section className="card p-6">
        <h2 className="font-serif text-lg text-[var(--navy)]">
          Partner / spouse
          <span className="ml-2 text-sm font-normal text-[var(--slate)]">
            (optional)
          </span>
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="spouse_name">
              Full name
            </label>
            <input id="spouse_name" name="spouse_name" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="spouse_age">
              Age
            </label>
            <input
              id="spouse_age"
              name="spouse_age"
              type="number"
              min={0}
              className="field"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="label" htmlFor="spouse_background">
              Educational & professional background
            </label>
            <textarea
              id="spouse_background"
              name="spouse_background"
              rows={4}
              className="field"
              placeholder="Degrees, occupation, experience, skills…"
            />
          </div>
        </div>
      </section>

      {/* Children */}
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-[var(--navy)]">Children</h2>
          <button type="button" onClick={addKid} className="btn-ghost">
            + Add child
          </button>
        </div>
        {kids.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--slate)]">
            No children added. Each child gets a dedicated opportunities page in
            the presentation.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {kids.map((kid, i) => (
              <div
                key={i}
                className="rounded-lg border border-[var(--border)] bg-[var(--cream)]/40 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--navy)]">
                    Child {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeKid(i)}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="label">Name</label>
                    <input
                      className="field"
                      value={kid.name}
                      onChange={(e) => updateKid(i, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Age</label>
                    <input
                      type="number"
                      min={0}
                      className="field"
                      value={kid.age}
                      onChange={(e) => updateKid(i, { age: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="label">
                      Schooling / interests / background
                    </label>
                    <textarea
                      rows={3}
                      className="field"
                      placeholder="Current grade/school, interests, strengths, ambitions…"
                      value={kid.background}
                      onChange={(e) =>
                        updateKid(i, { background: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save consultation"}
        </button>
      </div>
    </form>
  );
}
