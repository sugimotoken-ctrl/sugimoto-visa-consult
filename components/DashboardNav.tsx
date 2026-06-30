"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { signOut } from "@/app/auth/actions";
import type { Profile } from "@/lib/types";

const linkBase =
  "rounded-md px-3 py-1.5 text-sm font-medium transition whitespace-nowrap";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`${linkBase} ${
        active
          ? "bg-[var(--navy)] text-white"
          : "text-[var(--navy)] hover:bg-[var(--cream)]"
      }`}
    >
      {label}
    </Link>
  );
}

export function DashboardNav({ profile }: { profile: Profile }) {
  const isAdmin = profile.role === "admin";
  return (
    <header className="border-b border-[var(--border)] bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Link href="/dashboard" className="shrink-0">
          <Logo size={30} />
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-1">
          <NavLink href="/dashboard" label="Consultations" />
          {isAdmin && <NavLink href="/dashboard/admin/pathways" label="Pathways" />}
          {isAdmin && (
            <NavLink href="/dashboard/admin/locations" label="Locations" />
          )}
          {isAdmin && (
            <NavLink href="/dashboard/admin/languages" label="Languages" />
          )}
          {isAdmin && (
            <NavLink href="/dashboard/admin/consultants" label="Consultants" />
          )}
          {isAdmin && <NavLink href="/dashboard/admin/odoo" label="Odoo" />}
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium text-[var(--navy)]">
              {profile.full_name || profile.email}
            </div>
            <div className="text-xs uppercase tracking-wide text-[var(--orange)]">
              {profile.role}
            </div>
          </div>
          <form action={signOut}>
            <button className="btn-ghost" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
