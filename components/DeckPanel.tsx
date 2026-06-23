"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import type { DeckStatus } from "@/lib/types";

export function DeckPanel({
  consultationId,
  status,
  deckUrl,
  deckError,
}: {
  consultationId: string;
  status: DeckStatus;
  deckUrl: string | null;
  deckError: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(deckError);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/decks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-[var(--navy)]">
          Client presentation
        </h2>
        <StatusBadge status={busy ? "generating" : status} />
      </div>

      <p className="mt-2 text-sm text-[var(--slate)]">
        Generates a branded PowerPoint with a pathway overview plus a tailored
        opportunities page for the applicant, spouse, and each child — including
        AI-generated imagery.
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button onClick={generate} className="btn-accent" disabled={busy}>
          {busy
            ? "Generating… (this can take a minute)"
            : status === "ready"
              ? "Regenerate presentation"
              : "Generate presentation"}
        </button>
        {status === "ready" && deckUrl && !busy && (
          <a href={deckUrl} className="btn-primary" download>
            Download .pptx
          </a>
        )}
      </div>

      {busy && (
        <p className="mt-3 text-xs text-[var(--slate)]">
          Writing slide copy and creating images. Please keep this tab open.
        </p>
      )}
    </div>
  );
}
