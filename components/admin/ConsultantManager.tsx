"use client";

import { useTransition } from "react";
import {
  setConsultantStatus,
  setConsultantRole,
  deleteConsultant,
} from "@/app/dashboard/admin/actions";
import type { Profile } from "@/lib/types";

const statusStyle: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  disabled: "bg-slate-200 text-slate-600",
};

export function ConsultantManager({
  profiles,
  currentUserId,
}: {
  profiles: Profile[];
  currentUserId: string;
}) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-[var(--cream)] text-left text-xs uppercase tracking-wide text-[var(--slate)]">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <Row key={p.id} p={p} isSelf={p.id === currentUserId} />
          ))}
          {profiles.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-[var(--slate)]">
                No accounts yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Row({ p, isSelf }: { p: Profile; isSelf: boolean }) {
  const [pending, start] = useTransition();
  return (
    <tr className="border-t border-[var(--border)]">
      <td className="px-4 py-3 font-medium text-[var(--navy)]">
        {p.full_name || "—"}
        {isSelf && <span className="ml-1 text-xs text-[var(--slate)]">(you)</span>}
      </td>
      <td className="px-4 py-3 text-[var(--slate)]">{p.email}</td>
      <td className="px-4 py-3">
        <span className="rounded bg-[var(--cream)] px-2 py-0.5 text-xs uppercase tracking-wide text-[var(--navy)]">
          {p.role}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle[p.status]}`}
        >
          {p.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {p.status !== "active" && (
            <button
              className="text-xs font-semibold text-emerald-700 hover:underline"
              disabled={pending}
              onClick={() => start(() => setConsultantStatus(p.id, "active"))}
            >
              Activate
            </button>
          )}
          {p.status === "active" && !isSelf && (
            <button
              className="text-xs font-semibold text-amber-700 hover:underline"
              disabled={pending}
              onClick={() => start(() => setConsultantStatus(p.id, "disabled"))}
            >
              Disable
            </button>
          )}
          {!isSelf && (
            <button
              className="text-xs font-semibold text-[var(--navy)] hover:underline"
              disabled={pending}
              onClick={() =>
                start(() =>
                  setConsultantRole(
                    p.id,
                    p.role === "admin" ? "consultant" : "admin"
                  )
                )
              }
            >
              {p.role === "admin" ? "Make consultant" : "Make admin"}
            </button>
          )}
          {!isSelf && (
            <button
              className="text-xs font-semibold text-red-600 hover:underline"
              disabled={pending}
              onClick={() => {
                if (
                  confirm(
                    `Permanently delete ${p.email}? This removes their account and consultations.`
                  )
                )
                  start(() => deleteConsultant(p.id));
              }}
            >
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
