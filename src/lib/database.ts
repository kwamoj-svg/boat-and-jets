import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { ExtractedListing } from "./claude-ai";

/* ── Supabase client (lazy init, graceful fallback if not configured) ── */
let _client: SupabaseClient | null = null;
let _unavailable = false;

function getClient(): SupabaseClient | null {
  if (_unavailable) return null;
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    _unavailable = true;
    console.log("[DB] Supabase not configured — running without cache");
    return null;
  }
  _client = createClient(url, key);
  return _client;
}

/* ── Types ── */
interface CachedBoat {
  id: string;
  name: string;
  type: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  length_ft: number | null;
  cabins: number | null;
  guests: number | null;
  crew: number | null;
  price_per_day: number | null;
  price_per_week: number | null;
  sale_price: number | null;
  currency: string;
  region: string | null;
  country: string | null;
  port: string | null;
  detail_url: string;
  source_domain: string;
  image_url: string | null;
  features: string[];
  description: string | null;
  luxury_level: number;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

/* ── Hash helper ── */
function queryHash(q: string): string {
  // Simple hash: lowercase, trim, remove extra spaces, sort words
  return q.toLowerCase().trim().replace(/\s+/g, " ");
}

/* ─────────────────────────────────────────────
   SEARCH CACHE
   Caches full search results for 6 hours
   ───────────────────────────────────────────── */

export async function getCachedSearch(query: string): Promise<ExtractedListing[] | null> {
  const db = getClient();
  if (!db) return null;
  try {
    const hash = queryHash(query);
    const { data, error } = await db
      .from("search_cache")
      .select("results")
      .eq("query_hash", hash)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return null;
    return data.results as ExtractedListing[];
  } catch {
    return null;
  }
}

export async function cacheSearchResults(
  query: string,
  results: ExtractedListing[],
  parsedQuery?: Record<string, unknown>
): Promise<void> {
  const db = getClient();
  if (!db || results.length === 0) return;
  try {
    const hash = queryHash(query);
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(); // 6h
    await db.from("search_cache").upsert(
      {
        query_hash: hash,
        query_text: query,
        parsed_query: parsedQuery || null,
        results,
        expires_at: expiresAt,
      },
      { onConflict: "query_hash" }
    );
  } catch {
    /* non-critical */
  }
}

/* ─────────────────────────────────────────────
   BOAT REGISTRY
   Stores individual boats with verified detail URLs.
   Grows over time — the more searches, the better the data.
   ───────────────────────────────────────────── */

/** Save/update boats — only stores boats with non-category detail URLs */
export async function saveBoats(listings: ExtractedListing[]): Promise<void> {
  const db = getClient();
  if (!db) return;
  try {
    const boats = listings
      .filter((l) => {
        // Only store boats with real detail URLs (not category pages)
        try {
          const path = new URL(l.source_url).pathname;
          const segments = path.split("/").filter(Boolean);
          return (
            segments.length >= 2 &&
            !/\/(search|results|fleet|boats?-list|yacht-charter|boat-rental|browse)\/?$/i.test(path)
          );
        } catch {
          return false;
        }
      })
      .map((l) => {
        let domain = "";
        try { domain = new URL(l.source_url).hostname.replace("www.", ""); } catch {}
        return {
          name: l.name,
          type: l.type || null,
          brand: l.brand || null,
          model: l.model || null,
          year: l.year || null,
          length_ft: l.length_ft || null,
          cabins: l.cabins || null,
          guests: l.guests || null,
          crew: l.crew || null,
          price_per_day: l.price_per_day || null,
          price_per_week: l.price_per_week || null,
          sale_price: l.sale_price || null,
          currency: l.currency || "EUR",
          region: l.region || null,
          country: l.country || null,
          port: l.port || null,
          detail_url: l.source_url,
          source_domain: domain,
          image_url: l.image_url || null,
          features: l.features || [],
          description: (l.description || "").slice(0, 500),
          luxury_level: l.luxury_level || 3,
          verified: false,
          updated_at: new Date().toISOString(),
        };
      });

    if (boats.length === 0) return;

    // Upsert by name + domain (avoid duplicates)
    for (const boat of boats) {
      await db.from("boats").upsert(boat, {
        onConflict: "name,source_domain",
      });
    }
  } catch {
    /* non-critical */
  }
}

/** Find boats in DB matching a search query */
export async function findCachedBoats(opts: {
  country?: string;
  region?: string;
  city?: string;
  boatType?: string;
  guests?: number;
  budgetPerDay?: number;
  currency?: string;
}): Promise<ExtractedListing[]> {
  const db = getClient();
  if (!db) return [];
  try {
    let query = db.from("boats").select("*").limit(30);

    // Location filter — match country, region, or port
    if (opts.country) {
      query = query.or(
        `country.ilike.%${opts.country}%,region.ilike.%${opts.country}%,port.ilike.%${opts.country}%`
      );
    }
    if (opts.region && opts.region !== opts.country) {
      query = query.or(`region.ilike.%${opts.region}%`);
    }
    if (opts.city) {
      query = query.or(`port.ilike.%${opts.city}%,country.ilike.%${opts.city}%`);
    }

    // Boat type
    if (opts.boatType) {
      query = query.ilike("type", `%${opts.boatType}%`);
    }

    // Guests
    if (opts.guests) {
      query = query.gte("guests", opts.guests);
    }

    // Budget
    if (opts.budgetPerDay) {
      query = query.lte("price_per_day", opts.budgetPerDay * 1.3); // 30% tolerance
    }

    query = query.order("updated_at", { ascending: false });

    const { data, error } = await query;
    if (error || !data) return [];

    // Convert DB rows to ExtractedListing
    return (data as CachedBoat[]).map((b) => ({
      name: b.name,
      type: b.type || "motor",
      brand: b.brand || undefined,
      model: b.model || undefined,
      year: b.year || undefined,
      length_ft: b.length_ft || undefined,
      cabins: b.cabins || undefined,
      guests: b.guests || undefined,
      crew: b.crew || undefined,
      price_per_day: b.price_per_day || undefined,
      price_per_week: b.price_per_week || undefined,
      sale_price: b.sale_price || undefined,
      currency: b.currency,
      region: b.region || "",
      country: b.country || "",
      port: b.port || undefined,
      features: b.features || [],
      description: b.description || "",
      source_url: b.detail_url,
      source_title: `${b.source_domain} — ${b.name}`,
      luxury_level: b.luxury_level,
      match_score: 0.72, // DB results get a decent score
      match_reasons: ["Cached listing", "verified URL"],
      ai_summary: b.description?.slice(0, 120) || "",
      image_url: b.image_url || undefined,
    }));
  } catch {
    return [];
  }
}

/** Look up known detail URL for a boat name from a specific domain */
export async function findDetailUrl(
  boatName: string,
  domain: string
): Promise<string | null> {
  const db = getClient();
  if (!db) return null;
  try {
    const { data } = await db
      .from("boats")
      .select("detail_url")
      .eq("source_domain", domain)
      .ilike("name", `%${boatName}%`)
      .limit(1)
      .single();
    return data?.detail_url || null;
  } catch {
    return null;
  }
}

/** Bulk lookup: for a set of (name, domain) pairs, return known detail URLs */
export async function bulkFindDetailUrls(
  listings: ExtractedListing[]
): Promise<Map<string, string>> {
  const db = getClient();
  const result = new Map<string, string>();
  if (!db || listings.length === 0) return result;

  try {
    // Get all unique domains
    const domains = [...new Set(listings.map((l) => {
      try { return new URL(l.source_url).hostname.replace("www.", ""); } catch { return ""; }
    }).filter(Boolean))];

    if (domains.length === 0) return result;

    const { data } = await db
      .from("boats")
      .select("name, source_domain, detail_url")
      .in("source_domain", domains);

    if (!data) return result;

    // For each listing, find a matching DB entry
    for (const listing of listings) {
      let domain = "";
      try { domain = new URL(listing.source_url).hostname.replace("www.", ""); } catch { continue; }

      const nameLower = listing.name.toLowerCase();
      const match = data.find(
        (d: { name: string; source_domain: string; detail_url: string }) =>
          d.source_domain === domain &&
          (d.name.toLowerCase() === nameLower ||
           d.name.toLowerCase().includes(nameLower) ||
           nameLower.includes(d.name.toLowerCase()))
      );
      if (match) {
        result.set(listing.name, match.detail_url);
      }
    }
  } catch {
    /* non-critical */
  }

  return result;
}

/* ─────────────────────────────────────────────
   CHARTER DB: Instant search against Supabase charter_boats
   Returns results formatted as ExtractedListing for the search page
   ───────────────────────────────────────────── */

export async function searchCharterBoats(opts: {
  query?: string;
  country?: string;
  region?: string;
  city?: string;
  boatType?: string;
  guests?: number;
  budgetPerDay?: number;
  limit?: number;
}): Promise<ExtractedListing[]> {
  const db = getClient();
  if (!db) return [];

  try {
    let query = db
      .from("charter_boats")
      .select("*, charter_companies(company_name, slug, country, city, website, email, phone)")
      .eq("status", "active")
      .limit(opts.limit || 30);

    if (opts.boatType) {
      const typeMap: Record<string, string[]> = {
        motor: ["motorboat", "yacht", "speedboat"],
        motorboat: ["motorboat", "yacht", "speedboat"],
        motorboot: ["motorboat", "yacht", "speedboat"],
        sailing: ["sailboat"],
        sailboat: ["sailboat"],
        segelboot: ["sailboat"],
        segelyacht: ["sailboat", "yacht"],
        catamaran: ["catamaran"],
        katamaran: ["catamaran"],
        gulet: ["gulet"],
        yacht: ["yacht", "motorboat", "sailboat", "catamaran"], // generic — match all luxury
        speedboat: ["speedboat", "motorboat"],
        houseboat: ["houseboat"],
        jetski: ["jet_ski"],
      };
      const types = typeMap[opts.boatType.toLowerCase()] || [opts.boatType.toLowerCase()];
      if (types.length === 1) {
        query = query.eq("boat_type", types[0]);
      } else {
        query = query.in("boat_type", types);
      }
    }

    // Combine country/region/city/base_port into a single OR — many parsers
    // disagree about which field something like "Sardinien" or "Mallorca"
    // belongs in (region vs city vs port), and the DB normalization isn't
    // always perfect either. Match if ANY field contains the term.
    const locationTerms: string[] = [];
    if (opts.country) locationTerms.push(opts.country);
    if (opts.region && !locationTerms.includes(opts.region)) locationTerms.push(opts.region);
    if (opts.city && !locationTerms.includes(opts.city)) locationTerms.push(opts.city);

    if (locationTerms.length > 0) {
      const orParts = locationTerms.flatMap((t) => {
        const safe = t.replace(/[(),%]/g, ""); // sanitize for PostgREST or-string
        return [
          `country.ilike.%${safe}%`,
          `region.ilike.%${safe}%`,
          `base_port.ilike.%${safe}%`,
        ];
      });
      query = query.or(orParts.join(","));
    }
    if (opts.guests) {
      query = query.gte("max_guests", opts.guests);
    }
    if (opts.budgetPerDay) {
      query = query.lte("price_per_day", opts.budgetPerDay * 1.3);
    }

    // Free-text search — only apply if no structured filters already matched
    // (otherwise it over-restricts: "Segelboot Kroatien" already filters by
    // boat_type=sailboat AND country=Croatia, no need to also require those
    // words in name/brand/etc.)
    const hasStructuredFilters = !!(
      opts.boatType || opts.country || opts.region || opts.city || opts.guests
    );

    if (!hasStructuredFilters && opts.query && opts.query.trim().length > 0) {
      const STOP_WORDS = new Set([
        "boot", "boat", "yacht", "charter", "mieten", "rental", "hire", "book",
        "segelboot", "motorboot", "katamaran", "sailing", "sailboat", "motorboat", "catamaran",
        "kroatien", "croatia", "spanien", "spain", "griechenland", "greece", "italien", "italy",
        "frankreich", "france", "türkei", "tuerkei", "turkey", "max", "bis", "unter", "under",
        "pro", "per", "tag", "day", "woche", "week", "der", "die", "das", "ein", "eine",
      ]);
      const words = opts.query
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.replace(/[^\wäöüß]/g, ""))
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

      if (words.length > 0) {
        const orConditions = words
          .map((w) => `name.ilike.%${w}%,brand.ilike.%${w}%,model.ilike.%${w}%,base_port.ilike.%${w}%,description.ilike.%${w}%`)
          .join(",");
        query = query.or(orConditions);
      }
    }

    query = query.order("price_per_day", { ascending: true, nullsFirst: false });

    const { data, error } = await query;
    if (error) {
      console.error("[searchCharterBoats] query error:", error.message);
      return [];
    }
    if (!data) return [];

    // Convert to ExtractedListing format
    return data.map((boat: Record<string, unknown>) => {
      const company = boat.charter_companies as Record<string, unknown> | null;
      const companyName = company ? String(company.company_name || "") : "";
      const companyWebsite = company ? String(company.website || "") : "";

      const images = Array.isArray(boat.images) ? (boat.images as string[]) : [];
      const detailUrl = boat.detail_url ? String(boat.detail_url) : null;

      return {
        name: String(boat.name) || `${String(boat.brand || "")} ${String(boat.model || "")}`.trim(),
        type: String(boat.boat_type || "motorboat"),
        length_ft: boat.length_m ? Math.round(Number(boat.length_m) * 3.281) : null,
        cabins: boat.cabins ? Number(boat.cabins) : null,
        guests: boat.max_guests ? Number(boat.max_guests) : null,
        crew: boat.crew_size ? Number(boat.crew_size) : null,
        year: boat.year ? Number(boat.year) : null,
        price_per_day: boat.price_per_day ? Number(boat.price_per_day) : null,
        price_per_week: boat.price_per_week ? Number(boat.price_per_week) : null,
        sale_price: null,
        currency: String(boat.currency || "EUR"),
        location: [boat.base_port, boat.country].filter(Boolean).join(", "),
        source_url: detailUrl || companyWebsite || `https://veliqa.life/charter/${boat.slug}`,
        image_url: images[0] || null,
        description: String(boat.description || ""),
        features: Array.isArray(boat.features) ? boat.features.map(String) : [],
        ai_summary: `${companyName} — ${String(boat.charter_type || "bareboat")} charter in ${[boat.base_port, boat.country].filter(Boolean).join(", ")}`,
        match_score: 0.85,
        match_reasons: ["Aus VELIQA Datenbank", companyName].filter(Boolean),
        luxury_level: boat.price_per_day && Number(boat.price_per_day) > 1000 ? 4 : boat.price_per_day && Number(boat.price_per_day) > 500 ? 3 : 2,
        verified: true,
        region: String(boat.region || ""),
        country: String(boat.country || ""),
        source_title: companyName || String(boat.name || ""),
      } as unknown as ExtractedListing;
    });
  } catch {
    return [];
  }
}

/* ─────────────────────────────────────────────
   CHARTER COMPANIES: search the 1000+ providers
   Each matching company becomes a listing — represents
   their fleet as a whole, links to their website.
   ───────────────────────────────────────────── */

interface CharterCompanyRow {
  id: string;
  company_name: string;
  slug: string;
  company_type: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  marina: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  cover_image: string | null;
  description: string | null;
  fleet_size: number | null;
  rating: number | null;
  review_count: number | null;
  verified: boolean;
  featured: boolean;
  services: string[] | null;
  languages: string[] | null;
  price_range: string | null;
}

export async function searchCharterCompanies(opts: {
  query?: string;
  country?: string;
  region?: string;
  city?: string;
  boatType?: string;
  limit?: number;
}): Promise<ExtractedListing[]> {
  const db = getClient();
  if (!db) return [];

  try {
    let query = db
      .from("charter_companies")
      .select("*")
      .limit(opts.limit || 30);

    // Location: OR across country/region/city/marina — same as boats search
    const locationTerms: string[] = [];
    if (opts.country) locationTerms.push(opts.country);
    if (opts.region && !locationTerms.includes(opts.region)) locationTerms.push(opts.region);
    if (opts.city && !locationTerms.includes(opts.city)) locationTerms.push(opts.city);

    if (locationTerms.length > 0) {
      const orParts = locationTerms.flatMap((t) => {
        const safe = t.replace(/[(),%]/g, "");
        return [
          `country.ilike.%${safe}%`,
          `region.ilike.%${safe}%`,
          `city.ilike.%${safe}%`,
          `marina.ilike.%${safe}%`,
        ];
      });
      query = query.or(orParts.join(","));
    }

    // Note: We deliberately don't filter companies by boat_type — charter
    // companies typically operate mixed fleets (motor + sailing + catamaran)
    // and their `services` arrays use generic terms like "skippered",
    // "bareboat", "crewed", "luxury" rather than boat-type specific labels.
    // Filtering would exclude too many relevant providers.

    query = query
      .order("featured", { ascending: false })
      .order("rating", { ascending: false, nullsFirst: false })
      .order("fleet_size", { ascending: false, nullsFirst: false });

    const { data, error } = await query;
    if (error) {
      console.error("[searchCharterCompanies] query error:", error.message);
      return [];
    }
    if (!data) return [];

    return (data as CharterCompanyRow[]).map((c) => {
      const location = [c.city, c.region, c.country].filter(Boolean).join(", ");
      const services = Array.isArray(c.services) ? c.services : [];

      // Infer boat_type from services
      let type = "yacht";
      if (services.some((s) => /sail/i.test(s))) type = "sailing";
      if (services.some((s) => /cat/i.test(s))) type = "catamaran";
      if (services.some((s) => /gulet/i.test(s))) type = "gulet";
      if (services.some((s) => /motor|power/i.test(s))) type = "motor";

      const luxury = c.price_range === "luxury" || c.price_range === "premium" ? 4
        : c.price_range === "mid" ? 3 : 2;

      const reasons: string[] = ["Charter-Anbieter"];
      if (c.verified) reasons.push("Verifiziert");
      if (c.featured) reasons.push("Featured");
      if (c.fleet_size && c.fleet_size >= 10) reasons.push(`${c.fleet_size} Boote in der Flotte`);
      if (c.rating && c.rating >= 4) reasons.push(`★ ${c.rating.toFixed(1)}`);

      return {
        name: c.company_name,
        type,
        length_ft: null,
        cabins: null,
        guests: null,
        crew: null,
        year: null,
        price_per_day: null,
        price_per_week: null,
        sale_price: null,
        currency: "EUR",
        location,
        source_url: c.website || `https://veliqa.life/charter/company/${c.slug}`,
        image_url: c.cover_image || c.logo_url || null,
        description: (c.description || "").slice(0, 300),
        features: services,
        ai_summary: `Charter-Anbieter in ${location}${c.fleet_size ? ` — Flotte mit ${c.fleet_size} Booten` : ""}${c.rating ? ` (★ ${c.rating.toFixed(1)})` : ""}`,
        match_score: c.featured ? 0.9 : c.verified ? 0.78 : 0.7,
        match_reasons: reasons,
        luxury_level: luxury,
        verified: c.verified,
        region: c.region || "",
        country: c.country || "",
        source_title: c.company_name,
        is_company: true,
      } as unknown as ExtractedListing;
    });
  } catch {
    return [];
  }
}
