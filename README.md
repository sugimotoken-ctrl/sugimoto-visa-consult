# Sugimoto Visa — Consultation Studio

Internal tool for Sugimoto Visa consultants. After a consultation, a consultant
captures the client's details and generates a branded PowerPoint presentation
that explains the immigration pathway(s) discussed and the opportunities awaiting
the applicant, their spouse, and each child — complete with AI-written copy and
AI-generated imagery.

## Features

- **Consultant accounts** — sign up / sign in; new accounts are pending until an
  admin activates them.
- **Consultation intake** — applicant + spouse (name, age, education/professional
  background), unlimited children, up to two programs, country and optional city,
  client email.
- **AI presentation generator** — GPT writes tailored slide copy grounded in the
  admin-defined pathway notes; `gpt-image-1` generates imagery; the deck is
  assembled as a branded `.pptx` and stored for download.
- **Admin panel** — manage pathways (with descriptions/requirements/talking
  points that feed the AI), countries & cities, and consultant accounts
  (approve / disable / change role / remove).

## Tech stack

Next.js 16 (App Router) · Supabase (Auth + Postgres + Storage) · OpenAI ·
pptxgenjs · Tailwind CSS · deploys to Vercel.

## Setup

### 1. Supabase

1. Create a project at <https://supabase.com>.
2. Open the **SQL editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql).
   This creates all tables, RLS policies, the new-user trigger, and the private
   `decks` storage bucket.
3. From **Project Settings → API**, copy the Project URL, the `anon` public key,
   and the `service_role` key.

### 2. Environment

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server-only, never exposed to the browser
OPENAI_API_KEY=sk-...
SEED_ADMIN_EMAIL=admin@sugimotovisa.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Install & seed the admin

```bash
npm install
npm run seed:admin   # whitelists SEED_ADMIN_EMAIL as an admin
```

Then sign up in the app using `SEED_ADMIN_EMAIL` — you'll be created as an
active admin automatically. (If you sign up first and seed after, the script
promotes the existing account.)

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

## Usage

1. **Admin** adds at least one **pathway** (Pathways tab) and one **country**
   (Locations tab). Give pathways rich descriptions/requirements/talking points
   — the AI uses them to keep slides accurate.
2. **Admin** approves new consultant sign-ups under **Consultants**.
3. A **consultant** creates a consultation, then clicks **Generate
   presentation** on the consultation page to produce and download the `.pptx`.

## Deploying to Vercel

1. Push to GitHub and import the repo in Vercel.
2. Add all the env vars from `.env.local` to the Vercel project settings.
3. Deck generation can take 1–2 minutes; the API route sets `maxDuration = 300`,
   which requires a Vercel plan that allows longer function durations.

## Notes

- Generated decks live in a **private** Supabase Storage bucket; download links
  are long-lived signed URLs created server-side with the service role.
- Email confirmation behavior follows your Supabase Auth settings. For a quick
  internal rollout you may disable "Confirm email" in Supabase Auth settings.
