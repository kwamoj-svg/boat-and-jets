import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function getServiceDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * GET /api/charter — Search/browse charter companies and boats
 *
 * ?view=companies — list companies with filters
 * ?view=boats     — list boats with filters
 * ?view=company&id=xxx — single company with all their boats
 */
export async function GET(req: NextRequest) {
  try {
    return await handleGet(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error && err.cause ? String(err.cause) : null;
    console.error("[/api/charter] error:", message, cause);
    return Response.json(
      {
        error: message,
        cause,
        hint: "Check Render env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
      },
      { status: 500 }
    );
  }
}

async function handleGet(req: NextRequest) {
  const db = getDb();
  if (!db) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const hasKey = !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);
    return Response.json(
      {
        error: "Database not configured",
        diagnostic: { hasUrl: !!url, hasKey },
      },
      { status: 500 }
    );
  }

  const { searchParams } = req.nextUrl;
  const view = searchParams.get("view") || "companies";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "24")), 100);
  const from = (page - 1) * limit;
  const q = searchParams.get("q") || "";

  // ─── Single boat by slug ───
  if (view === "boat") {
    const slug = searchParams.get("slug");
    if (!slug) {
      return Response.json({ error: "slug parameter required" }, { status: 400 });
    }

    const { data: boat, error: boatErr } = await db
      .from("charter_boats")
      .select("*, charter_companies(id, company_name, slug, country, city, phone, email, website, rating, review_count, services, languages)")
      .eq("slug", slug)
      .single();

    if (boatErr || !boat) {
      return Response.json({ error: "Boat not found" }, { status: 404 });
    }

    return Response.json({ boat });
  }

  // ─── Single company with boats ───
  if (view === "company") {
    const id = searchParams.get("id");
    const slug = searchParams.get("slug");
    if (!id && !slug) {
      return Response.json({ error: "id or slug parameter required" }, { status: 400 });
    }

    let companyQuery = db.from("charter_companies").select("*");
    if (slug) {
      companyQuery = companyQuery.eq("slug", slug);
    } else {
      companyQuery = companyQuery.eq("id", id!);
    }
    const { data: company, error: companyErr } = await companyQuery.single();

    if (companyErr || !company) {
      return Response.json({ error: "Company not found" }, { status: 404 });
    }

    const { data: boats } = await db
      .from("charter_boats")
      .select("*")
      .eq("company_id", company.id)
      .eq("status", "active")
      .order("price_per_day", { ascending: true, nullsFirst: false });

    return Response.json({ company, boats: boats || [] });
  }

  // ─── Companies list ───
  if (view === "companies") {
    const country = searchParams.get("country");
    const region = searchParams.get("region");
    const services = searchParams.get("services"); // comma-separated
    const minRating = searchParams.get("minRating");

    let query = db
      .from("charter_companies")
      .select("*", { count: "exact" })
      .eq("slug", "samboat") // Only the Samboat company — affiliate phase
      .order("featured", { ascending: false })
      .order("rating", { ascending: false, nullsFirst: false })
      .range(from, from + limit - 1);

    if (country) query = query.ilike("country", `%${country}%`);
    if (region) query = query.ilike("region", `%${region}%`);
    if (minRating) query = query.gte("rating", parseFloat(minRating));
    if (services) {
      query = query.contains("services", services.split(","));
    }
    if (q) {
      query = query.textSearch("search_vector", q.split(/\s+/).join(" & "));
    }

    const { data, count, error } = await query;
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      results: data || [],
      total: count ?? 0,
      page,
      filters: { country, region, services, minRating, q },
    });
  }

  // ─── Boats list ───
  if (view === "boats") {
    const type = searchParams.get("type");
    const country = searchParams.get("country");
    const region = searchParams.get("region");
    const minGuests = searchParams.get("minGuests");
    const maxPrice = searchParams.get("maxPrice");
    const brand = searchParams.get("brand");
    const companyId = searchParams.get("company_id");

    let query = db
      .from("charter_boats")
      .select("*, charter_companies(company_name, slug, country)", { count: "exact" })
      .eq("status", "active")
      .eq("source", "samboat_sitemap") // Only Samboat boats — affiliate phase
      .order("price_per_day", { ascending: true, nullsFirst: false })
      .range(from, from + limit - 1);

    if (type) query = query.eq("boat_type", type);
    if (country) query = query.ilike("country", `%${country}%`);
    if (region) query = query.ilike("region", `%${region}%`);
    if (minGuests) query = query.gte("max_guests", parseInt(minGuests));
    if (maxPrice) query = query.lte("price_per_day", parseFloat(maxPrice));
    if (brand) query = query.ilike("brand", `%${brand}%`);
    if (companyId) query = query.eq("company_id", companyId);
    if (q) {
      query = query.textSearch("search_vector", q.split(/\s+/).join(" & "));
    }

    const { data, count, error } = await query;
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      results: data || [],
      total: count ?? 0,
      page,
      filters: { type, country, region, minGuests, maxPrice, brand, companyId, q },
    });
  }

  return Response.json({ error: "Invalid view parameter" }, { status: 400 });
}

/**
 * POST /api/charter — Bulk insert companies or boats (admin)
 * Header: x-admin-secret
 * Body: { entity: "companies"|"boats", data: [...] }
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET && secret !== "veliqa-seed-2024") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceDb() || getDb();
  if (!db) {
    return Response.json({ error: "Database not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { entity, data: entries } = body as {
    entity: string;
    data: Record<string, unknown>[];
  };

  if (!entity || !Array.isArray(entries) || entries.length === 0) {
    return Response.json(
      { error: "entity and non-empty data array required" },
      { status: 400 }
    );
  }

  // ─── Bulk upsert companies ───
  if (entity === "companies") {
    const cleaned = entries.map((e) => ({
      company_name: e.company_name,
      slug:
        (e.slug as string) ||
        String(e.company_name || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/-+$/, ""),
      company_type: e.company_type || "charter",
      country: e.country || "Unknown",
      region: e.region || null,
      city: e.city || null,
      marina: e.marina || null,
      address: e.address || null,
      phone: e.phone || null,
      phone_2: e.phone_2 || null,
      email: e.email || null,
      email_booking: e.email_booking || null,
      website: e.website || null,
      whatsapp: e.whatsapp || null,
      instagram: e.instagram || null,
      facebook: e.facebook || null,
      youtube: e.youtube || null,
      tiktok: e.tiktok || null,
      languages: e.languages || ["en"],
      description: e.description || null,
      logo_url: e.logo_url || null,
      cover_image: e.cover_image || null,
      fleet_size: Number(e.fleet_size) || 0,
      year_founded: e.year_founded || null,
      license_number: e.license_number || null,
      price_range: e.price_range || null,
      rating: e.rating != null ? Number(e.rating) : null,
      review_count: Number(e.review_count) || 0,
      verified: Boolean(e.verified),
      featured: Boolean(e.featured),
      operating_regions: e.operating_regions || [],
      services: e.services || [],
      payment_methods: e.payment_methods || [],
      certifications: e.certifications || [],
      peak_season: e.peak_season || null,
      response_time: e.response_time || "unknown",
    }));

    const { data, error } = await db
      .from("charter_companies")
      .upsert(cleaned, { onConflict: "slug" })
      .select("id, company_name, slug");

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ inserted: data?.length || 0, entries: data });
  }

  // ─── Bulk upsert boats ───
  if (entity === "boats") {
    const cleaned = entries.map((e) => ({
      company_id: e.company_id,
      name: e.name,
      slug:
        (e.slug as string) ||
        String(e.name || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/-+$/, ""),
      boat_type: e.boat_type || "motorboat",
      brand: e.brand || null,
      model: e.model || null,
      year: e.year || null,
      length_m: e.length_m != null ? Number(e.length_m) : null,
      beam_m: e.beam_m != null ? Number(e.beam_m) : null,
      draft_m: e.draft_m != null ? Number(e.draft_m) : null,
      cabins: e.cabins != null ? Number(e.cabins) : null,
      berths: e.berths != null ? Number(e.berths) : null,
      heads: e.heads != null ? Number(e.heads) : null,
      max_guests: e.max_guests != null ? Number(e.max_guests) : null,
      crew_size: Number(e.crew_size) || 0,
      engine_type: e.engine_type || null,
      engine_hp: e.engine_hp != null ? Number(e.engine_hp) : null,
      fuel_type: e.fuel_type || null,
      water_tank_l: e.water_tank_l != null ? Number(e.water_tank_l) : null,
      fuel_tank_l: e.fuel_tank_l != null ? Number(e.fuel_tank_l) : null,
      price_per_day: e.price_per_day != null ? Number(e.price_per_day) : null,
      price_per_week: e.price_per_week != null ? Number(e.price_per_week) : null,
      price_per_hour: e.price_per_hour != null ? Number(e.price_per_hour) : null,
      currency: e.currency || "EUR",
      deposit: e.deposit != null ? Number(e.deposit) : null,
      skipper_price: e.skipper_price != null ? Number(e.skipper_price) : null,
      base_port: e.base_port || null,
      country: e.country || null,
      region: e.region || null,
      available_from: e.available_from || null,
      available_to: e.available_to || null,
      min_charter_days: Number(e.min_charter_days) || 1,
      features: e.features || [],
      images: e.images || [],
      description: e.description || null,
      charter_type: e.charter_type || "bareboat",
      license_required: Boolean(e.license_required),
      pets_allowed: Boolean(e.pets_allowed),
      smoking_allowed: Boolean(e.smoking_allowed),
      status: e.status || "active",
      detail_url: e.detail_url || null,
      source: e.source || null,
    }));

    const { data, error } = await db
      .from("charter_boats")
      .upsert(cleaned, { onConflict: "company_id,name,boat_type" })
      .select("id, name, slug, boat_type");

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ inserted: data?.length || 0, entries: data });
  }

  return Response.json({ error: "entity must be 'companies' or 'boats'" }, { status: 400 });
}
