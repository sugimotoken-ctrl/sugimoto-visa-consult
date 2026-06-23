import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Returns the signed-in user's profile, or null if not signed in / no profile.
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}

// Require an active account; otherwise redirect appropriately.
export async function requireActiveProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/pending");
  return profile;
}

// Require an active admin.
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireActiveProfile();
  if (profile.role !== "admin") redirect("/dashboard");
  return profile;
}
