"use client";

import { useActionState, useTransition } from "react";
import {
  createLanguage,
  toggleLanguage,
  deleteLanguage,
} from "@/app/dashboard/admin/actions";
import type { Language } from "@/lib/types";

export function LanguageManager({ languages }: { languages: Language[] }) {
  const [state, action, pending] = useActionState(createLanguage, null);

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-serif text-lg text-[var(--navy)]">Add language</h2>
        <p className="mt-1 text-sm text-[var(--slate)]">
          Presentations will be written in the language chosen for each
          consultation. Tick &ldquo;right-to-left&rdquo; for scripts like Persian
          (Farsi) or Arabic so the deck lays out correctly.
        </p>
        <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="grow">
            <label className="label">Language name *</label>
            <input
              name="name"
              className="field"
              placeholder="e.g. Persian (Farsi)"
              required
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-[var(--navy)]">
            <input type="checkbox" name="rtl" className="h-4 w-4" />
            Right-to-left
          </label>
          <button className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Add"}
          </button>
        </form>
        {state?.error && (
          <p className="mt-2 text-sm text-red-600">{state.error}</p>
        )}
      </div>

      <div className="space-y-3">
        {languages.length === 0 && (
          <p className="text-sm text-[var(--slate)]">No languages yet.</p>
        )}
        {languages.map((l) => (
          <LanguageRow key={l.id} l={l} />
        ))}
      </div>
    </div>
  );
}

function LanguageRow({ l }: { l: Language }) {
  const [pending, start] = useTransition();
  return (
    <div className="card flex items-center justify-between p-5">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-[var(--navy)]">{l.name}</span>
        {l.rtl && (
          <span className="rounded-full bg-[var(--cream)] px-2 py-0.5 text-xs text-[var(--orange)]">
            RTL
          </span>
        )}
        {!l.active && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            Inactive
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <button
          className="btn-ghost"
          disabled={pending}
          onClick={() => start(() => toggleLanguage(l.id, !l.active))}
        >
          {l.active ? "Deactivate" : "Activate"}
        </button>
        <button
          className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          disabled={pending}
          onClick={() => {
            if (confirm(`Delete language "${l.name}"?`))
              start(() => deleteLanguage(l.id));
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
