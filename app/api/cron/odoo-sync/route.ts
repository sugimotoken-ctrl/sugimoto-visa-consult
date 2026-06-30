import { NextResponse } from "next/server";
import { performOdooSync } from "@/lib/odoo-sync";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

// Hourly Odoo import, triggered by Vercel Cron.
// Secured with CRON_SECRET: Vercel includes `Authorization: Bearer <CRON_SECRET>`
// on cron invocations when that env var is set.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await performOdooSync();
  const status = result.error ? 500 : 200;
  return NextResponse.json({ at: new Date().toISOString(), ...result }, { status });
}
