import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSsr } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Rich admin overview — boat counts by source/country/type, recent
 * activity, scrape health, broker leads stats.  Hidden behind auth +
 * admin role (or CRON_SECRET for debugging).
 */

async function isAdmin(): Promise<boolean> {
  try {
    const ssr = await createSsr();
    const { data: { user } } = await ssr.auth.getUser();
    if (!user) return false;
    const { data: p } = await ssr.from("profiles").select("role").eq("id", user.id).maybeSingle();
    return p?.role === "admin";
  } catch { return false; }
}

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  // Allow CRON_SECRET bypass for testing
  const ok = await isAdmin();
  if (!ok) {
    // Still return public-safe sample for dev. Comment out for production.
    return NextResponse.json({ error: "Admin only" }, { status: 401 });
  }

  const db = adminDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const out: Record<string, unknown> = {};

  // ── Totals
  const totals = await Promise.all([
    db.from("charter_boats").select("id", { count: "exact", head: true }),
    db.from("charter_boats").select("id", { count: "exact", head: true }).eq("source", "samboat_sitemap"),
    db.from("charter_boats").select("id", { count: "exact", head: true }).not("price_per_day", "is", null),
    db.from("sale_boats").select("id", { count: "exact", head: true }),
    db.from("charter_companies").select("id", { count: "exact", head: true }),
    db.from("partners").select("id", { count: "exact", head: true }),
    db.from("partners").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("crm_entries").select("id", { count: "exact", head: true }),
    db.from("analytics_events").select("id", { count: "exact", head: true }).eq("entity_type", "broker_lead"),
  ]);
  out.totals = {
    charterBoats: totals[0].count ?? 0,
    samboatBoats: totals[1].count ?? 0,
    boatsWithPrice: totals[2].count ?? 0,
    saleBoats: totals[3].count ?? 0,
    companies: totals[4].count ?? 0,
    partners: totals[5].count ?? 0,
    pendingPartners: totals[6].count ?? 0,
    crmEntries: totals[7].count ?? 0,
    brokerLeads: totals[8].count ?? 0,
  };

  // ── Boats by country (top 10)
  const { data: byCountry } = await db
    .from("charter_boats")
    .select("country")
    .eq("status", "active")
    .not("country", "is", null)
    .limit(5000);
  const countryCount: Record<string, number> = {};
  for (const r of (byCountry as { country: string | null }[] | null) || []) {
    if (r.country) countryCount[r.country] = (countryCount[r.country] || 0) + 1;
  }
  out.byCountry = Object.entries(countryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([country, count]) => ({ country, count }));

  // ── Boats by type
  const { data: byType } = await db
    .from("charter_boats")
    .select("boat_type")
    .eq("status", "active")
    .limit(10000);
  const typeCount: Record<string, number> = {};
  for (const r of (byType as { boat_type: string }[] | null) || []) {
    typeCount[r.boat_type] = (typeCount[r.boat_type] || 0) + 1;
  }
  out.byType = Object.entries(typeCount)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }));

  // ── Recent scrape runs
  const { data: scrapeLog } = await db
    .from("scrape_log")
    .select("targets, scraped, inserted, created_at")
    .order("created_at", { ascending: false })
    .limit(8);
  out.recentScrapes = scrapeLog || [];

  // ── Recent broker leads
  const { data: recentLeads } = await db
    .from("analytics_events")
    .select("entity_name, country, metadata, created_at")
    .eq("entity_type", "broker_lead")
    .order("created_at", { ascending: false })
    .limit(5);
  out.recentLeads = recentLeads || [];

  // ── Search activity (last 24h)
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const { count: searchesToday } = await db
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "search")
    .gte("created_at", yesterday);
  out.searchesLast24h = searchesToday ?? 0;

  // ── Top searches (entity_name)
  const { data: searchRows } = await db
    .from("analytics_events")
    .select("entity_name")
    .eq("event_type", "search")
    .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
    .not("entity_name", "is", null)
    .limit(500);
  const searchCount: Record<string, number> = {};
  for (const r of (searchRows as { entity_name: string | null }[] | null) || []) {
    if (r.entity_name) searchCount[r.entity_name] = (searchCount[r.entity_name] || 0) + 1;
  }
  out.topSearches = Object.entries(searchCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([q, n]) => ({ query: q, count: n }));

  return NextResponse.json(out);
}
