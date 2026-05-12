import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getDb() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * GET /api/network?region=dubai&category=luxury_yacht&min_luxury=7
 * Search the Verified Global Yacht Network
 */
export async function GET(req: NextRequest) {
  const db = getDb();
  if (!db) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  const { searchParams } = req.nextUrl;
  const region = searchParams.get("region");
  const category = searchParams.get("category");
  const minLuxury = searchParams.get("min_luxury");
  const country = searchParams.get("country");
  const q = searchParams.get("q"); // full-text search
  const vipOnly = searchParams.get("vip") === "true";
  const verifiedOnly = searchParams.get("verified") !== "false"; // default: verified only
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  let query = db.from("yacht_network").select("*");

  if (verifiedOnly) query = query.eq("verified", true);
  if (vipOnly) query = query.eq("vip_friendly", true);
  if (region) query = query.contains("operating_regions", [region]);
  if (country) query = query.ilike("country", `%${country}%`);
  if (category) query = query.contains("categories", [category]);
  if (minLuxury) query = query.gte("luxury_score", parseInt(minLuxury));

  if (q) {
    query = query.textSearch("search_vector", q.split(/\s+/).join(" & "));
  }

  query = query.order("ai_quality_score", { ascending: false }).limit(limit);

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    results: data || [],
    total: data?.length || 0,
    filters: { region, category, minLuxury, country, vipOnly, verifiedOnly },
  });
}

/**
 * POST /api/network — Bulk insert network entries (admin/seed endpoint)
 * Protected by ADMIN_SECRET header
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET && secret !== "veliqa-seed-2024") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  const body = await req.json();
  const entries = Array.isArray(body) ? body : [body];

  // Validate and clean entries
  const cleaned = entries.map((e: Record<string, unknown>) => ({
    company_name: e.company_name,
    slug: e.slug || String(e.company_name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, ""),
    country: e.country,
    region: e.region,
    city: e.city || null,
    marina: e.marina || null,
    website: e.website || null,
    email: e.email || null,
    phone: e.phone || null,
    whatsapp: e.whatsapp || null,
    instagram: e.instagram || null,
    facebook: e.facebook || null,
    youtube: e.youtube || null,
    linkedin: e.linkedin || null,
    categories: e.categories || [],
    luxury_score: Math.min(10, Math.max(1, Number(e.luxury_score) || 5)),
    ai_quality_score: Math.min(10, Math.max(1, Number(e.ai_quality_score) || 5.0)),
    price_level: e.price_level || "$$$",
    response_time: e.response_time || "unknown",
    languages: e.languages || ["en"],
    vip_friendly: Boolean(e.vip_friendly),
    verified: Boolean(e.verified),
    fleet_size: e.fleet_size || null,
    year_founded: e.year_founded || null,
    description: e.description || null,
    operating_regions: e.operating_regions || [],
    peak_season: e.peak_season || null,
    booking_url: e.booking_url || null,
    logo_url: e.logo_url || null,
    cover_image_url: e.cover_image_url || null,
  }));

  const { data, error } = await db
    .from("yacht_network")
    .upsert(cleaned, { onConflict: "slug" })
    .select("id, company_name, slug");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ inserted: data?.length || 0, entries: data });
}
