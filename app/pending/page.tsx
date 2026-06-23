import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { signOut } from "@/app/auth/actions";

export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { new: isNew } = await searchParams;
  const profile = await getProfile();

  // Active users don't belong here.
  if (profile?.status === "active") redirect("/dashboard");

  const disabled = profile?.status === "disabled";

  return (
    <AuthShell
      title={disabled ? "Account disabled" : "Account pending approval"}
      subtitle={
        disabled
          ? "Your access has been turned off. Please contact an administrator."
          : isNew
            ? "Thanks for signing up! If email confirmation is enabled, confirm your email first."
            : "An administrator needs to activate your account before you can continue."
      }
    >
      <div className="space-y-4 text-sm text-[var(--slate)]">
        <p>
          {disabled
            ? "If you believe this is a mistake, reach out to your Sugimoto Visa administrator."
            : "You'll be able to sign in and start preparing consultations once your account is approved."}
        </p>
        <div className="flex gap-3">
          <Link href="/login" className="btn-ghost">
            Back to sign in
          </Link>
          {profile && (
            <form action={signOut}>
              <button className="btn-ghost" type="submit">
                Sign out
              </button>
            </form>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
