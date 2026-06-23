import type { DeckStatus } from "@/lib/types";

const styles: Record<DeckStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  generating: "bg-amber-100 text-amber-700",
  ready: "bg-emerald-100 text-emerald-700",
  error: "bg-red-100 text-red-700",
};

const labels: Record<DeckStatus, string> = {
  draft: "Draft",
  generating: "Generating…",
  ready: "Ready",
  error: "Error",
};

export function StatusBadge({ status }: { status: DeckStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
