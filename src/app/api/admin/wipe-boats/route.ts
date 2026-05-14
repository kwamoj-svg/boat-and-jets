import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Wipe charter_boats — keeps the companies row(s) but deletes all
 * boats so we can re-import from a different source.
 *
 *  GET /api/admin/wipe-boats?source=samboat_sitemap
 *  Header: x-cron-secret: ...
 *
 *  Without ?source it refuses (safety). Pass ?confirm=1 + ?source=ALL
 *  to wipe absolutely everything.
 */

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const source = req.nextUrl.searchParams.get("source");
  const table = req.nextUrl.searchParams.get("table") || "charter_boats";
  const confirm = req.nextUrl.searchParams.get("confirm") === "1";

  if (!source) {
    return NextResponse.json({
      error: "Specify ?source=...",
      hint: "?source=samboat_sitemap | auto_scrape | marketplace | social_media | classifieds | ALL&confirm=1 . Optional ?table=sale_boats",
    }, { status: 400 });
  }

  if (table !== "charter_boats" && table !== "sale_boats") {
    return NextResponse.json({ error: "table must be charter_boats or sale_boats" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  const db = createClient(url, key);

  let query = db.from(table).delete({ count: "exact" });
  if (source === "ALL") {
    if (!confirm) return NextResponse.json({ error: "source=ALL requires &confirm=1" }, { status: 400 });
    query = query.neq("id", "00000000-0000-0000-0000-000000000000");
  } else {
    query = query.eq("source", source);
  }

  const { error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, table, source, deleted: count ?? 0 });
}
