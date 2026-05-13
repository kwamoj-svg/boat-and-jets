import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Admin API — Provides dashboard stats, entity management,
 * and bulk operations for the VELIQA admin console.
 *
 * Auth: Bearer token from Supabase session + admin role check
 * OR x-admin-secret header for scripts/CLI.
 */

const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function getAnonClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const k = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !k) return null;
  return createClient(url, k);
}

async function checkAdmin(request: NextRequest): Promise<boolean> {
  // Method 1: Admin secret header (for scripts)
  const secret = request.headers.get("x-admin-secret");
  if (secret && ADMIN_SECRET && secret === ADMIN_SECRET) return true;

  // Method 2: Supabase session with admin role
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.slice(7);
  const db = getAnonClient();
  if (!db) return false;

  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return false;

  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin";
}

// ─── GET: Dashboard stats or entity lists ───
export async function GET(request: NextRequest) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceClient() || getAnonClient();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const entity = searchParams.get("entity") || "stats";

  // ─ Dashboard Stats ─
  if (entity === "stats") {
    const [users, partners, partnerBoats, networkPartners, searches] = await Promise.all([
      db.from("profiles").select("id", { count: "exact", head: true }),
      db.from("partners").select("id", { count: "exact", head: true }),
      db.from("partner_boats").select("id", { count: "exact", head: true }),
      db.from("yacht_network").select("id", { count: "exact", head: true }),
      db.from("search_cache").select("id", { count: "exact", head: true }),
    ]);

    const [pendingPartners, activeBoats, verifiedNetwork] = await Promise.all([
      db.from("partners").select("id", { count: "exact", head: true }).eq("status", "pending"),
      db.from("partner_boats").select("id", { count: "exact", head: true }).eq("status", "active"),
      db.from("yacht_network").select("id", { count: "exact", head: true }).eq("verified", true),
    ]);

    return NextResponse.json({
      users: users.count ?? 0,
      partners: partners.count ?? 0,
      pendingPartners: pendingPartners.count ?? 0,
      partnerBoats: partnerBoats.count ?? 0,
      activeBoats: activeBoats.count ?? 0,
      networkPartners: networkPartners.count ?? 0,
      verifiedNetwork: verifiedNetwork.count ?? 0,
      searches: searches.count ?? 0,
    });
  }

  // ─ Users ─
  if (entity === "users") {
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const q = searchParams.get("q") || "";
    const from = (page - 1) * limit;

    let query = db.from("profiles").select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (q) {
      query = query.or(`display_name.ilike.%${q}%`);
    }

    const { data, count, error } = await query;
    return NextResponse.json({ results: data ?? [], total: count ?? 0, page, error: error?.message });
  }

  // ─ Partners ─
  if (entity === "partners") {
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const status = searchParams.get("status") || "";
    const from = (page - 1) * limit;

    let query = db.from("partners").select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (status) query = query.eq("status", status);

    const { data, count, error } = await query;
    return NextResponse.json({ results: data ?? [], total: count ?? 0, page, error: error?.message });
  }

  // ─ Partner Boats ─
  if (entity === "partner_boats") {
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const status = searchParams.get("status") || "";
    const from = (page - 1) * limit;

    let query = db.from("partner_boats").select("*, partners(company_name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (status) query = query.eq("status", status);

    const { data, count, error } = await query;
    return NextResponse.json({ results: data ?? [], total: count ?? 0, page, error: error?.message });
  }

  // ─ Network Partners ─
  if (entity === "network") {
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const region = searchParams.get("region") || "";
    const q = searchParams.get("q") || "";
    const from = (page - 1) * limit;

    let query = db.from("yacht_network").select("*", { count: "exact" })
      .order("ai_quality_score", { ascending: false })
      .range(from, from + limit - 1);

    if (region) query = query.contains("operating_regions", [region]);
    if (q) query = query.or(`company_name.ilike.%${q}%,country.ilike.%${q}%,city.ilike.%${q}%`);

    const { data, count, error } = await query;
    return NextResponse.json({ results: data ?? [], total: count ?? 0, page, error: error?.message });
  }

  // ─ Charter Companies ─
  if (entity === "charter_companies") {
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const country = searchParams.get("country") || "";
    const q = searchParams.get("q") || "";
    const from = (page - 1) * limit;

    let query = db.from("charter_companies").select("*", { count: "exact" })
      .order("featured", { ascending: false })
      .order("rating", { ascending: false, nullsFirst: false })
      .range(from, from + limit - 1);

    if (country) query = query.ilike("country", `%${country}%`);
    if (q) query = query.or(`company_name.ilike.%${q}%,country.ilike.%${q}%,city.ilike.%${q}%`);

    const { data, count, error } = await query;
    return NextResponse.json({ results: data ?? [], total: count ?? 0, page, error: error?.message });
  }

  // ─ Charter Boats ─
  if (entity === "charter_boats") {
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const boatType = searchParams.get("boat_type") || "";
    const q = searchParams.get("q") || "";
    const from = (page - 1) * limit;

    let query = db.from("charter_boats").select("*, charter_companies(company_name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (boatType) query = query.eq("boat_type", boatType);
    if (q) query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%,base_port.ilike.%${q}%`);

    const { data, count, error } = await query;
    return NextResponse.json({ results: data ?? [], total: count ?? 0, page, error: error?.message });
  }

  // ─ Search Cache ─
  if (entity === "searches") {
    const { data } = await db.from("search_cache")
      .select("id, query_text, created_at, expires_at")
      .order("created_at", { ascending: false })
      .limit(100);

    return NextResponse.json({ results: data ?? [] });
  }

  // ─ Analytics Overview ─
  if (entity === "analytics") {
    const days = parseInt(searchParams.get("days") || "30");
    const since = new Date(Date.now() - days * 86400000).toISOString();

    // Get raw counts per event type
    const eventTypes = ["page_view", "search", "boat_click", "charter_click", "company_click", "contact_click", "destination_click", "filter_use", "outbound_link"];
    const counts: Record<string, number> = {};
    await Promise.all(
      eventTypes.map(async (t) => {
        const { count } = await db
          .from("analytics_events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", t)
          .gte("created_at", since);
        counts[t] = count ?? 0;
      })
    );

    // Total unique sessions
    const { data: sessionData } = await db
      .from("analytics_events")
      .select("session_id")
      .gte("created_at", since)
      .limit(10000);
    const uniqueSessions = new Set((sessionData ?? []).map((r: Record<string, string>) => r.session_id)).size;

    // Top clicked boats
    const { data: topBoats } = await db
      .from("analytics_events")
      .select("entity_id, entity_name")
      .eq("event_type", "boat_click")
      .gte("created_at", since)
      .limit(5000);

    const boatCounts: Record<string, { name: string; count: number }> = {};
    for (const r of topBoats ?? []) {
      const key = r.entity_id || "unknown";
      if (!boatCounts[key]) boatCounts[key] = { name: r.entity_name || key, count: 0 };
      boatCounts[key].count++;
    }
    const topBoatsList = Object.entries(boatCounts)
      .map(([id, v]) => ({ id, name: v.name, clicks: v.count }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 20);

    // Top searches
    const { data: topSearches } = await db
      .from("analytics_events")
      .select("search_query")
      .eq("event_type", "search")
      .gte("created_at", since)
      .not("search_query", "is", null)
      .limit(5000);

    const searchCounts: Record<string, number> = {};
    for (const r of topSearches ?? []) {
      const q = (r.search_query || "").toLowerCase().trim();
      if (q) searchCounts[q] = (searchCounts[q] || 0) + 1;
    }
    const topSearchesList = Object.entries(searchCounts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Top destinations
    const { data: topDests } = await db
      .from("analytics_events")
      .select("entity_name")
      .eq("event_type", "destination_click")
      .gte("created_at", since)
      .limit(5000);

    const destCounts: Record<string, number> = {};
    for (const r of topDests ?? []) {
      const d = r.entity_name || "unknown";
      destCounts[d] = (destCounts[d] || 0) + 1;
    }
    const topDestsList = Object.entries(destCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Device breakdown
    const { data: deviceData } = await db
      .from("analytics_events")
      .select("device_type")
      .gte("created_at", since)
      .limit(10000);

    const devices: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };
    for (const r of deviceData ?? []) {
      const d = r.device_type || "desktop";
      devices[d] = (devices[d] || 0) + 1;
    }

    // Daily trend (last N days)
    const { data: dailyData } = await db
      .from("analytics_events")
      .select("created_at, event_type")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(50000);

    const dailyTrend: Record<string, Record<string, number>> = {};
    for (const r of dailyData ?? []) {
      const day = r.created_at?.slice(0, 10) || "";
      if (!dailyTrend[day]) dailyTrend[day] = {};
      dailyTrend[day][r.event_type] = (dailyTrend[day][r.event_type] || 0) + 1;
    }

    // Top pages
    const { data: pageData } = await db
      .from("analytics_events")
      .select("page_url")
      .eq("event_type", "page_view")
      .gte("created_at", since)
      .limit(5000);

    const pageCounts: Record<string, number> = {};
    for (const r of pageData ?? []) {
      const p = r.page_url || "/";
      pageCounts[p] = (pageCounts[p] || 0) + 1;
    }
    const topPages = Object.entries(pageCounts)
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Contact clicks breakdown
    const { data: contactData } = await db
      .from("analytics_events")
      .select("entity_name, metadata")
      .eq("event_type", "contact_click")
      .gte("created_at", since)
      .limit(5000);

    const contactCounts: Record<string, { total: number; methods: Record<string, number> }> = {};
    for (const r of contactData ?? []) {
      const name = r.entity_name || "unknown";
      if (!contactCounts[name]) contactCounts[name] = { total: 0, methods: {} };
      contactCounts[name].total++;
      const method = (r.metadata as Record<string, string>)?.method || "other";
      contactCounts[name].methods[method] = (contactCounts[name].methods[method] || 0) + 1;
    }
    const topContacts = Object.entries(contactCounts)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);

    return NextResponse.json({
      period_days: days,
      total_events: Object.values(counts).reduce((a, b) => a + b, 0),
      unique_sessions: uniqueSessions,
      event_counts: counts,
      devices,
      daily_trend: dailyTrend,
      top_boats: topBoatsList,
      top_searches: topSearchesList,
      top_destinations: topDestsList,
      top_pages: topPages,
      top_contacts: topContacts,
    });
  }

  // ─ Analytics: Recent Events ─
  if (entity === "analytics_events") {
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const eventType = searchParams.get("event_type") || "";
    const entityId = searchParams.get("entity_id") || "";
    const from = (page - 1) * limit;

    let query = db.from("analytics_events").select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (eventType) query = query.eq("event_type", eventType);
    if (entityId) query = query.eq("entity_id", entityId);

    const { data, count, error } = await query;
    return NextResponse.json({ results: data ?? [], total: count ?? 0, page, error: error?.message });
  }

  return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
}

// ─── PATCH: Update entities ───
export async function PATCH(request: NextRequest) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceClient() || getAnonClient();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const body = await request.json();
  const { entity, id, updates } = body;

  if (!entity || !id || !updates) {
    return NextResponse.json({ error: "entity, id, and updates required" }, { status: 400 });
  }

  const allowedEntities = ["profiles", "partners", "partner_boats", "yacht_network", "charter_companies", "charter_boats"];
  if (!allowedEntities.includes(entity)) {
    return NextResponse.json({ error: "Invalid entity" }, { status: 400 });
  }

  const { error } = await db.from(entity).update(updates).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ─── DELETE: Remove entities ───
export async function DELETE(request: NextRequest) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceClient() || getAnonClient();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const entity = searchParams.get("entity");
  const id = searchParams.get("id");

  if (!entity || !id) {
    return NextResponse.json({ error: "entity and id required" }, { status: 400 });
  }

  const allowedEntities = ["partners", "partner_boats", "yacht_network", "search_cache", "charter_companies", "charter_boats"];
  if (!allowedEntities.includes(entity)) {
    return NextResponse.json({ error: "Invalid entity" }, { status: 400 });
  }

  // Soft-delete for partners/boats, hard-delete for network/cache/charter
  if (entity === "partners") {
    await db.from(entity).update({ status: "rejected" }).eq("id", id);
  } else if (entity === "partner_boats") {
    await db.from(entity).update({ status: "deleted" }).eq("id", id);
  } else if (entity === "charter_boats") {
    await db.from(entity).update({ status: "deleted" }).eq("id", id);
  } else {
    await db.from(entity).delete().eq("id", id);
  }

  return NextResponse.json({ success: true });
}
