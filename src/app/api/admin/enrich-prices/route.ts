import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSsr } from "@/lib/supabase/server";
import { enrichBoataroundBoat } from "@/lib/boataround-enrich";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Bulk-enrich Boataround boats with prices + specs + features.
 *
 * Auth: admin role (no CRON_SECRET needed). The user is already logged in.
 *
 *   GET /api/admin/enrich-prices?count=50
 *
 * Processes up to `count` boats per call (default 50, max 100 to stay
 * within the 300s serverless limit at ~3s per boat). Returns:
 *   { processed, enriched, remaining }
 *
 * The admin UI calls this in a loop until remaining=0 so the whole
 * catalog gets filled by clicking one button.
 */

async function isAdmin(): Promise<boolean> {
  try {
    const ssr = await createSsr();
    const { data: { user } } = await ssr.auth.getUser();
    if (!user) return false;
    const { data: p } = await ssr.from("profiles").select("role").eq("id", user.id).maybeSingle();
    return p?.role === "admin";
  } catch {
    return false;
  }
}

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const ok = await isAdmin();
  if (!ok) return NextResponse.json({ error: "Admin only" }, { status: 401 });

  const db = adminDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const count = Math.min(
    Math.max(1, parseInt(req.nextUrl.searchParams.get("count") || "50")),
    100
  );

  // Pick the next batch — Boataround boats missing price OR specs
  const { data: rows, error } = await db
    .from("charter_boats")
    .select("id, detail_url")
    .eq("source", "boataround_sitemap")
    .is("price_per_day", null)
    .not("detail_url", "is", null)
    .order("created_at", { ascending: true })
    .limit(count);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rows || rows.length === 0) {
    return NextResponse.json({ processed: 0, enriched: 0, remaining: 0, done: true });
  }

  // Remaining count for progress UI
  const { count: remainingTotal } = await db
    .from("charter_boats")
    .select("id", { count: "exact", head: true })
    .eq("source", "boataround_sitemap")
    .is("price_per_day", null)
    .not("detail_url", "is", null);

  let enriched = 0;
  const errors: string[] = [];

  // Concurrency 6 — Boataround detail fetch is ~1-2s, total batch ~3-4 min
  const CONCURRENCY = 6;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((r) => enrichBoataroundBoat(String(r.id), String(r.detail_url)))
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value === true) enriched++;
      else if (r.status === "rejected" && errors.length < 5) {
        errors.push(String((r.reason as Error)?.message || r.reason));
      }
    }
  }

  const remaining = Math.max(0, (remainingTotal ?? rows.length) - enriched);

  return NextResponse.json({
    processed: rows.length,
    enriched,
    remaining,
    done: remaining === 0,
    errors,
  });
}
