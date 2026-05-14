import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 60;

/**
 * One-shot data-cleanup endpoint.
 *
 * Fixes:
 *  - Duplicate-brand names ("Azimut Azimut 58" → "Azimut 58")
 *  - Junk suffixes ("Hallberg Rassy 352 Copy Improoved" → "Hallberg Rassy 352")
 *  - Bogus prices (< 50 €/day, < 200 €/week → NULL)
 *  - Cryptic listing-ID suffixes in names
 *
 * Trigger: GET /api/admin/cleanup  with x-cron-secret header
 */

function getServiceDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function cleanName(name: string, brand: string | null): string {
  if (!name) return name;
  let n = name.trim();

  // Strip duplicate-brand prefix ("Azimut Azimut 58" → "Azimut 58")
  if (brand) {
    const b = brand.trim();
    const rx = new RegExp(`^${b}\\s+${b}\\b`, "i");
    n = n.replace(rx, b);
  }
  // Generic case: same word twice in a row at start
  n = n.replace(/^([A-Za-zÄÖÜäöüß-]+)\s+\1\b/i, "$1");

  // Strip junk suffixes
  n = n.replace(/\s+(Copy|Kopie|Improoved|Improved|Verbessert|Beep B?|Bee B)\b.*$/gi, "");

  // Strip cryptic alphanumeric IDs (5-8 chars at end) — but keep real models like "Lagoon 46"
  if (!/[A-Z][a-z]+\s+\d+$/.test(n)) {
    n = n.replace(/\s+[A-Za-z0-9]{5,8}$/, "");
  }

  // Collapse repeated whitespace
  n = n.replace(/\s+/g, " ").trim();
  return n;
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const report = {
    pricesPerDayNulled: 0,
    pricesPerWeekNulled: 0,
    namesFixed: 0,
    rowsDeleted: 0,
    saleNamesFixed: 0,
    errors: [] as string[],
  };

  // 1) Null bogus prices on charter_boats
  try {
    const { error, count } = await db
      .from("charter_boats")
      .update({ price_per_day: null }, { count: "exact" })
      .lt("price_per_day", 50);
    if (error) report.errors.push(`price_per_day: ${error.message}`);
    else report.pricesPerDayNulled = count ?? 0;
  } catch (e) {
    report.errors.push(String(e));
  }

  try {
    const { error, count } = await db
      .from("charter_boats")
      .update({ price_per_week: null }, { count: "exact" })
      .lt("price_per_week", 200);
    if (error) report.errors.push(`price_per_week: ${error.message}`);
    else report.pricesPerWeekNulled = count ?? 0;
  } catch (e) {
    report.errors.push(String(e));
  }

  // 2) Fix names — fetch all rows and update those that change
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await db
      .from("charter_boats")
      .select("id, name, brand")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      report.errors.push(`fetch chunk ${from}: ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;

    const updates: { id: string; name: string }[] = [];
    for (const row of data as { id: string; name: string; brand: string | null }[]) {
      const fresh = cleanName(row.name, row.brand);
      if (fresh && fresh !== row.name) {
        updates.push({ id: row.id, name: fresh });
      }
    }

    for (const u of updates) {
      const { error: ue } = await db
        .from("charter_boats")
        .update({ name: u.name })
        .eq("id", u.id);
      if (!ue) report.namesFixed++;
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }

  // 3) Same for sale_boats
  try {
    const { data } = await db
      .from("sale_boats")
      .select("id, name, brand")
      .limit(5000);
    for (const row of (data as { id: string; name: string; brand: string | null }[] | null) || []) {
      const fresh = cleanName(row.name, row.brand);
      if (fresh && fresh !== row.name) {
        await db.from("sale_boats").update({ name: fresh }).eq("id", row.id);
        report.saleNamesFixed++;
      }
    }
  } catch (e) {
    report.errors.push(`sale_boats names: ${e}`);
  }

  // 4) Delete completely useless rows (no price AND no images AND no description AND auto-scraped)
  try {
    const { error, count } = await db
      .from("charter_boats")
      .delete({ count: "exact" })
      .is("price_per_day", null)
      .is("price_per_week", null)
      .or("description.is.null,description.eq.")
      .like("source", "%scrape%");
    if (!error) report.rowsDeleted = count ?? 0;
  } catch (e) {
    report.errors.push(`delete: ${e}`);
  }

  // 5) Dedupe by detail_url — keep newest, delete older copies
  let dedupedCount = 0;
  try {
    const { data: allBoats } = await db
      .from("charter_boats")
      .select("id, detail_url, created_at")
      .not("detail_url", "is", null)
      .order("created_at", { ascending: false });

    const seen = new Map<string, string>(); // detail_url → first (newest) id
    const toDelete: string[] = [];
    for (const row of (allBoats as { id: string; detail_url: string; created_at: string }[] | null) || []) {
      if (!row.detail_url) continue;
      if (seen.has(row.detail_url)) {
        toDelete.push(row.id);
      } else {
        seen.set(row.detail_url, row.id);
      }
    }

    // Delete in batches of 100
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100);
      const { error } = await db.from("charter_boats").delete().in("id", batch);
      if (!error) dedupedCount += batch.length;
    }
  } catch (e) {
    report.errors.push(`dedupe: ${e}`);
  }

  return NextResponse.json({
    ok: true,
    ...report,
    duplicatesDeleted: dedupedCount,
  });
}
