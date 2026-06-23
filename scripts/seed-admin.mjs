// Registers SEED_ADMIN_EMAIL as an admin. Run with: npm run seed:admin
// - Adds the email to public.admin_emails (so future signup becomes admin).
// - If a user with that email already exists, promotes them to admin/active now.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_ADMIN_EMAIL;

if (!url || !serviceKey || !email) {
  console.error(
    "Missing env. Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_ADMIN_EMAIL."
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const lower = email.toLowerCase();

// 1) Whitelist the admin email.
{
  const { error } = await db
    .from("admin_emails")
    .upsert({ email: lower }, { onConflict: "email" });
  if (error) {
    console.error("Failed to add admin email:", error.message);
    process.exit(1);
  }
  console.log(`✓ Whitelisted ${lower} as admin.`);
}

// 2) If the user already signed up, promote them right away.
{
  const { data, error } = await db.auth.admin.listUsers();
  if (error) {
    console.error("Could not list users:", error.message);
    process.exit(1);
  }
  const existing = data.users.find((u) => u.email?.toLowerCase() === lower);
  if (existing) {
    const { error: upErr } = await db
      .from("profiles")
      .update({ role: "admin", status: "active" })
      .eq("id", existing.id);
    if (upErr) {
      console.error("Found user but failed to promote:", upErr.message);
      process.exit(1);
    }
    console.log(`✓ Promoted existing user ${lower} to admin/active.`);
  } else {
    console.log(
      `→ No account for ${lower} yet. Sign up with this email and you'll be admin automatically.`
    );
  }
}

console.log("Done.");
