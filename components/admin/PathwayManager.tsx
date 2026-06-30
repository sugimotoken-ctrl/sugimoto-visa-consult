"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  createPathway,
  updatePathway,
  togglePathway,
  deletePathway,
} from "@/app/dashboard/admin/actions";
import type { Pathway } from "@/lib/types";

const PROMPT_PLACEHOLDER =
  "Custom instructions the AI follows when writing this pathway's slides. " +
  "e.g. Emphasize the speed to permanent residency, mention the open work permit for spouses, " +
  "use an encouraging tone, and avoid quoting exact processing times.";

// Shared field set, used by both the create and edit forms.
function PathwayFields({ p }: { p?: Pathway }) {
  return (
    <>
      <div>
        <label className="label">Name *</label>
        <input name="name" className="field" defaultValue={p?.name ?? ""} required />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          name="description"
          rows={2}
          className="field"
          defaultValue={p?.description ?? ""}
          placeholder="Short summary of the program."
        />
      </div>
      <div>
        <label className="label">Key requirements</label>
        <textarea
          name="requirements"
          rows={3}
          className="field"
          defaultValue={p?.requirements ?? ""}
          placeholder="Eligibility criteria, points, language, funds, etc."
        />
      </div>
      <div>
        <label className="label">Talking points</label>
        <textarea
          name="talking_points"
          rows={3}
          className="field"
          defaultValue={p?.talking_points ?? ""}
          placeholder="Selling points and facts the AI should emphasize on slides."
        />
      </div>
      <div>
        <label className="label">Presentation prompt</label>
        <textarea
          name="prompt"
          rows={4}
          className="field"
          defaultValue={p?.prompt ?? ""}
          placeholder={PROMPT_PLACEHOLDER}
        />
        <p className="mt-1 text-xs text-[var(--slate)]">
          Extra instructions for how the AI should write the presentation for this
          pathway. Leave blank to use the default style.
        </p>
      </div>
    </>
  );
}

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
            <PathwayFields />
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
  const [editing, setEditing] = useState(false);
  const [state, action, saving] = useActionState(updatePathway, null);

  // Close the editor once a save succeeds.
  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  if (editing) {
    return (
      <div className="card p-5">
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={p.id} />
          <PathwayFields p={p} />
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <div className="flex gap-2">
            <button className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

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
            {p.prompt && (
              <span className="rounded-full bg-[var(--cream)] px-2 py-0.5 text-xs text-[var(--orange)]">
                Custom prompt
              </span>
            )}
          </div>
          {p.description && (
            <p className="mt-1 text-sm text-[var(--slate)]">{p.description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button className="btn-ghost" onClick={() => setEditing(true)}>
            Edit
          </button>
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
      {(p.requirements || p.talking_points || p.prompt) && (
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
          {p.prompt && (
            <div className="sm:col-span-2">
              <div className="text-xs uppercase tracking-wide text-[var(--slate)]">
                Presentation prompt
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-[var(--foreground)]">
                {p.prompt}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
