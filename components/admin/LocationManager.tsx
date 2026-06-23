"use client";

import { useActionState, useState, useTransition } from "react";
import {
  createCountry,
  deleteCountry,
  createCity,
  deleteCity,
} from "@/app/dashboard/admin/actions";
import type { City, Country } from "@/lib/types";

export function LocationManager({
  countries,
  cities,
}: {
  countries: Country[];
  cities: City[];
}) {
  const [cState, cAction, cPending] = useActionState(createCountry, null);
  const [tyState, tyAction, tyPending] = useActionState(createCity, null);
  const [selected, setSelected] = useState(countries[0]?.id ?? "");
  const [pending, start] = useTransition();

  const cityList = cities.filter((c) => c.country_id === selected);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Countries */}
      <div className="space-y-4">
        <div className="card p-6">
          <h2 className="font-serif text-lg text-[var(--navy)]">Countries</h2>
          <form action={cAction} className="mt-3 flex gap-2">
            <input
              name="name"
              className="field"
              placeholder="e.g. Canada"
              required
            />
            <button className="btn-primary shrink-0" disabled={cPending}>
              Add
            </button>
          </form>
          {cState?.error && (
            <p className="mt-2 text-sm text-red-600">{cState.error}</p>
          )}
          <ul className="mt-4 divide-y divide-[var(--border)]">
            {countries.map((c) => (
              <li
                key={c.id}
                className={`flex items-center justify-between py-2 ${
                  selected === c.id ? "font-semibold text-[var(--navy)]" : ""
                }`}
              >
                <button
                  className="text-left text-sm hover:underline"
                  onClick={() => setSelected(c.id)}
                >
                  {c.name}
                </button>
                <button
                  className="text-xs font-medium text-red-600 hover:underline"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`Delete ${c.name} and its cities?`))
                      start(() => deleteCountry(c.id));
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
            {countries.length === 0 && (
              <li className="py-2 text-sm text-[var(--slate)]">
                No countries yet.
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Cities */}
      <div className="card p-6">
        <h2 className="font-serif text-lg text-[var(--navy)]">Cities</h2>
        <p className="mt-1 text-sm text-[var(--slate)]">
          {selected
            ? `For ${countries.find((c) => c.id === selected)?.name ?? ""}`
            : "Select a country to manage its cities."}
        </p>
        {selected && (
          <>
            <form action={tyAction} className="mt-3 flex gap-2">
              <input type="hidden" name="country_id" value={selected} />
              <input
                name="name"
                className="field"
                placeholder="e.g. Toronto"
                required
              />
              <button className="btn-primary shrink-0" disabled={tyPending}>
                Add
              </button>
            </form>
            {tyState?.error && (
              <p className="mt-2 text-sm text-red-600">{tyState.error}</p>
            )}
            <ul className="mt-4 divide-y divide-[var(--border)]">
              {cityList.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  {c.name}
                  <button
                    className="text-xs font-medium text-red-600 hover:underline"
                    disabled={pending}
                    onClick={() => start(() => deleteCity(c.id))}
                  >
                    Delete
                  </button>
                </li>
              ))}
              {cityList.length === 0 && (
                <li className="py-2 text-sm text-[var(--slate)]">
                  No cities yet.
                </li>
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
