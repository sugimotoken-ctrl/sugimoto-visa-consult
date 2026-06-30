"use client";

import { useActionState, useState, useTransition } from "react";
import {
  saveOdooStage,
  mapTag,
  runOdooSync,
} from "@/app/dashboard/admin/odoo-actions";
import type { OdooConfig, Profile } from "@/lib/types";

type Stage = { id: number; name: string };
type Tag = { id: number; name: string };

export function OdooManager({
  configured,
  connection,
  stages,
  tags,
  consultants,
  config,
  mappings,
}: {
  configured: boolean;
  connection: { ok: boolean; error?: string };
  stages: Stage[];
  tags: Tag[];
  consultants: Profile[];
  config: OdooConfig | null;
  mappings: Record<number, string>; // odoo_tag_id -> consultant_id
}) {
  if (!configured) {
    return (
      <div className="card p-6">
        <h2 className="font-serif text-lg text-[var(--navy)]">
          Odoo not configured
        </h2>
        <p className="mt-2 text-sm text-[var(--slate)]">
          Set <code>ODOO_URL</code>, <code>ODOO_DB</code>,{" "}
          <code>ODOO_LOGIN</code> and <code>ODOO_API_KEY</code> in your
          environment (locally in <code>.env.local</code>, and in Vercel for
          production), then reload this page.
        </p>
      </div>
    );
  }

  if (!connection.ok) {
    return (
      <div className="card p-6">
        <h2 className="font-serif text-lg text-[var(--navy)]">
          Can&apos;t reach Odoo
        </h2>
        <p className="mt-2 text-sm text-red-600">{connection.error}</p>
        <p className="mt-2 text-sm text-[var(--slate)]">
          Check the URL, database name, login and API key, then reload.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
        ✓ Connected to Odoo.
      </div>

      <StagePicker stages={stages} config={config} />
      <TagMapping
        tags={tags}
        consultants={consultants}
        mappings={mappings}
      />
      <SyncPanel config={config} />
    </div>
  );
}

function StagePicker({
  stages,
  config,
}: {
  stages: Stage[];
  config: OdooConfig | null;
}) {
  const [state, action, pending] = useActionState(saveOdooStage, null);
  return (
    <div className="card p-6">
      <h2 className="font-serif text-lg text-[var(--navy)]">Source stage</h2>
      <p className="mt-1 text-sm text-[var(--slate)]">
        Cards in this CRM stage are imported as consultations.
      </p>
      <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="grow">
          <label className="label">CRM stage</label>
          <select
            name="stage_id"
            className="field"
            defaultValue={config?.source_stage_id ?? ""}
            onChange={(e) => {
              const sel = e.target.selectedOptions[0];
              const hidden = e.currentTarget.form?.elements.namedItem(
                "stage_name"
              ) as HTMLInputElement | null;
              if (hidden) hidden.value = sel?.text ?? "";
            }}
            required
          >
            <option value="">Select a stage…</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="hidden"
            name="stage_name"
            defaultValue={config?.source_stage_name ?? ""}
          />
        </div>
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save stage"}
        </button>
      </form>
      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {config?.source_stage_name && (
        <p className="mt-2 text-sm text-[var(--slate)]">
          Current: <strong>{config.source_stage_name}</strong>
        </p>
      )}
    </div>
  );
}

function TagMapping({
  tags,
  consultants,
  mappings,
}: {
  tags: Tag[];
  consultants: Profile[];
  mappings: Record<number, string>;
}) {
  return (
    <div className="card p-6">
      <h2 className="font-serif text-lg text-[var(--navy)]">
        Tag → consultant
      </h2>
      <p className="mt-1 text-sm text-[var(--slate)]">
        Each imported card is assigned to the consultant whose Odoo tag it
        carries. Unmapped cards are skipped during sync.
      </p>
      <div className="mt-4 divide-y divide-[var(--border)]">
        {tags.length === 0 && (
          <p className="py-2 text-sm text-[var(--slate)]">
            No CRM tags found in Odoo.
          </p>
        )}
        {tags.map((tag) => (
          <TagRow
            key={tag.id}
            tag={tag}
            consultants={consultants}
            current={mappings[tag.id] ?? ""}
          />
        ))}
      </div>
    </div>
  );
}

function TagRow({
  tag,
  consultants,
  current,
}: {
  tag: Tag;
  consultants: Profile[];
  current: string;
}) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState(current);
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="text-sm font-medium text-[var(--navy)]">{tag.name}</span>
      <select
        className="field max-w-xs"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          start(() => mapTag(tag.id, tag.name, v || null));
        }}
      >
        <option value="">— Not mapped —</option>
        {consultants.map((c) => (
          <option key={c.id} value={c.id}>
            {c.full_name || c.email}
          </option>
        ))}
      </select>
    </div>
  );
}

function SyncPanel({ config }: { config: OdooConfig | null }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-[var(--navy)]">Sync</h2>
        <button
          className="btn-accent"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await runOdooSync();
              setResult(
                r.error
                  ? `Error: ${r.error}`
                  : `Imported ${r.created} new · ${r.skippedExisting} already imported · ${r.skippedUnmapped} skipped (no consultant tag).`
              );
            })
          }
        >
          {pending ? "Syncing…" : "Sync now"}
        </button>
      </div>
      {result && (
        <p className="mt-3 rounded-md bg-[var(--cream)] px-3 py-2 text-sm text-[var(--foreground)]">
          {result}
        </p>
      )}
      {config?.last_synced_at && (
        <p className="mt-3 text-xs text-[var(--slate)]">
          Last sync: {new Date(config.last_synced_at).toLocaleString()}
          {config.last_sync_result ? ` — ${config.last_sync_result}` : ""}
        </p>
      )}
    </div>
  );
}
