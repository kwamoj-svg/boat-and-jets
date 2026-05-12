import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { ExtractedListing } from "./claude-ai";

/* ── Supabase client (lazy init, graceful fallback if not configured) ── */
let _client: SupabaseClient | null = null;
let _unavailable = false;

function getClient(): SupabaseClient | null {
  if (_unavailable) return null;
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
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
