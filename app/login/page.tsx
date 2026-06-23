"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/app/auth/actions";
import { AuthShell } from "@/components/AuthShell";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, null);

  return (
    <AuthShell
      title="Consultant sign in"
      subtitle="Access the Sugimoto Visa consultation studio."
      footer={
        <>
          New consultant?{" "}
          <Link href="/signup" className="font-semibold text-[var(--navy)] underline">
            Create an account
          </Link>
        </>
      }
    >
      <form action={action} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" className="field" required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="field"
            required
          />
        </div>
        {state?.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
