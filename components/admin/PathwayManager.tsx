"use client";

import { useActionState, useState, useTransition } from "react";
import {
  createPathway,
  togglePathway,
  deletePathway,
} from "@/app/dashboard/admin/actions";
import type { Pathway } from "@/lib/types";

export function PathwayManager({ pathways }: { pathways: Pathway[] }) {
  const [state, action, pending] = useActionState(createPathway, null);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-[var(--navy)]">Add pathway</h2>
          <button onClick={() => setOpen((o) => !o)} className="btn-ghost">
            {open ? "Close" : "New pathway"}
          </button>
        </div>
        {open && (
          <form action={action} className="mt-4 space-y-4">
            <div>
              <label className="label">Name *</label>
              <input name="name" className="field" required />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                name="description"
                rows={2}
                className="field"
                placeholder="Short summary of the program."
              />
            </div>
            <div>
              <label className="label">Key requirements</label>
              <textarea
                name="requirements"
                rows={3}
                className="field"
                placeholder="Eligibility criteria, points, language, funds, etc."
              />
            </div>
            <div>
              <label className="label">Talking points</label>
              <textarea
                name="talking_points"
                rows={3}
                className="field"
                placeholder="Selling points and facts the AI should emphasize on slides."
              />
            </div>
            {state?.error && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}
            <button className="btn-primary" disabled={pending}>
              {pending ? "Saving…" : "Save pathway"}
            </button>
          </form>
        )}
      </div>

      <div className="space-y-3">
        {pathways.length === 0 && (
          <p className="text-sm text-[var(--slate)]">No pathways yet.</p>
        )}
        {pathways.map((p) => (
          <PathwayRow key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}

function PathwayRow({ p }: { p: Pathway }) {
  const [pending, start] = useTransition();
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[var(--navy)]">{p.name}</h3>
            {!p.active && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                Inactive
              </span>
            )}
          </div>
          {p.description && (
            <p className="mt-1 text-sm text-[var(--slate)]">{p.description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            className="btn-ghost"
            disabled={pending}
            onClick={() => start(() => togglePathway(p.id, !p.active))}
          >
            {p.active ? "Deactivate" : "Activate"}
          </button>
          <button
            className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            disabled={pending}
            onClick={() => {
              if (confirm(`Delete pathway "${p.name}"?`))
                start(() => deletePathway(p.id));
            }}
          >
            Delete
          </button>
        </div>
      </div>
      {(p.requirements || p.talking_points) && (
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          {p.requirements && (
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--slate)]">
                Requirements
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-[var(--foreground)]">
                {p.requirements}
              </p>
            </div>
          )}
          {p.talking_points && (
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--slate)]">
                Talking points
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-[var(--foreground)]">
                {p.talking_points}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
