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

  // ─ Search Cache ─
  if (entity === "searches") {
    const { data } = await db.from("search_cache")
      .select("id, query_text, created_at, expires_at")
      .order("created_at", { ascending: false })
      .limit(100);

    return NextResponse.json({ results: data ?? [] });
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

  const allowedEntities = ["profiles", "partners", "partner_boats", "yacht_network"];
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

  const allowedEntities = ["partners", "partner_boats", "yacht_network", "search_cache"];
  if (!allowedEntities.includes(entity)) {
    return NextResponse.json({ error: "Invalid entity" }, { status: 400 });
  }

  // Soft-delete for partners/boats, hard-delete for network/cache
  if (entity === "partners") {
    await db.from(entity).update({ status: "rejected" }).eq("id", id);
  } else if (entity === "partner_boats") {
    await db.from(entity).update({ status: "deleted" }).eq("id", id);
  } else {
    await db.from(entity).delete().eq("id", id);
  }

  return NextResponse.json({ success: true });
}
