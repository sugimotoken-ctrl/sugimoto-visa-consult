"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/app/auth/actions";
import { AuthShell } from "@/components/AuthShell";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signUp, null);

  return (
    <AuthShell
      title="Create your account"
      subtitle="New accounts are reviewed by an administrator before activation."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--navy)] underline">
            Sign in
          </Link>
        </>
      }
    >
      <form action={action} className="space-y-4">
        <div>
          <label className="label" htmlFor="full_name">
            Full name
          </label>
          <input id="full_name" name="full_name" type="text" className="field" required />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Work email
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
            minLength={8}
            required
          />
          <p className="mt-1 text-xs text-[var(--slate)]">At least 8 characters.</p>
        </div>
        {state?.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
