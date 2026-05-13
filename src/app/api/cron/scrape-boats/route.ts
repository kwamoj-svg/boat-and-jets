import { NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { scrapeAllPlatforms } from "@/lib/platform-scrapers";
import type { ExtractedListing } from "@/lib/claude-ai";

export const maxDuration = 300; // 5 minutes

/**
 * Hourly scrape job — populates charter_boats with fresh listings.
 *
 * Trigger via Render Cron Job (every hour):
 *   GET https://veliqa.life/api/cron/scrape-boats
 *   Header: x-cron-secret: <secret>
 *
 * Rotates through a queue of (location, boat_type) targets across the world,
 * one batch per run. After ~24 runs the entire queue cycles.
 */

interface ScrapeTarget {
  location: string;
  boatType?: string;
  country: string;
  region?: string;
}

// Global queue — cycles through these top charter destinations
const SCRAPE_QUEUE: ScrapeTarget[] = [
  // Mediterranean — Spain
  { location: "Mallorca", country: "Spain", region: "Balearic Islands" },
  { location: "Ibiza", country: "Spain", region: "Balearic Islands" },
  { location: "Barcelona", country: "Spain" },
  { location: "Valencia", country: "Spain" },
  { location: "Menorca", country: "Spain", region: "Balearic Islands" },
  { location: "Gran Canaria", country: "Spain", region: "Canary Islands" },
  { location: "Tenerife", country: "Spain", region: "Canary Islands" },

  // Croatia
  { location: "Split", country: "Croatia" },
  { location: "Dubrovnik", country: "Croatia" },
  { location: "Zadar", country: "Croatia" },
  { location: "Pula", country: "Croatia" },
  { location: "Trogir", country: "Croatia" },
  { location: "Sibenik", country: "Croatia" },

  // Greece
  { location: "Athens", country: "Greece" },
  { location: "Mykonos", country: "Greece" },
  { location: "Santorini", country: "Greece" },
  { location: "Corfu", country: "Greece" },
  { location: "Rhodes", country: "Greece" },
  { location: "Lefkada", country: "Greece" },
  { location: "Kos", country: "Greece" },
  { location: "Crete", country: "Greece" },

  // Italy
  { location: "Sardinia", country: "Italy" },
  { location: "Sicily", country: "Italy" },
  { location: "Amalfi", country: "Italy" },
  { location: "Naples", country: "Italy" },
  { location: "Capri", country: "Italy" },
  { location: "Cinque Terre", country: "Italy" },

  // France
  { location: "Cote d'Azur", country: "France" },
  { location: "Cannes", country: "France" },
  { location: "Nice", country: "France" },
  { location: "Saint-Tropez", country: "France" },
  { location: "Corsica", country: "France" },

  // Turkey
  { location: "Bodrum", country: "Turkey" },
  { location: "Marmaris", country: "Turkey" },
  { location: "Fethiye", country: "Turkey" },
  { location: "Gocek", country: "Turkey" },

  // Montenegro / Malta
  { location: "Tivat", country: "Montenegro" },
  { location: "Valletta", country: "Malta" },

  // Caribbean
  { location: "Saint Martin", country: "Caribbean" },
  { location: "British Virgin Islands", country: "Caribbean" },
  { location: "Antigua", country: "Caribbean" },
  { location: "Grenada", country: "Caribbean" },
  { location: "Bahamas", country: "Caribbean" },

  // Southeast Asia
  { location: "Phuket", country: "Thailand" },
  { location: "Langkawi", country: "Malaysia" },
  { location: "Bali", country: "Indonesia" },

  // Northern Europe
  { location: "Stockholm", country: "Sweden" },
  { location: "Amsterdam", country: "Netherlands" },
  { location: "Hamburg", country: "Germany" },

  // USA
  { location: "Miami", country: "USA" },
  { location: "San Diego", country: "USA" },
  { location: "Newport", country: "USA" },

  // Australia
  { location: "Sydney", country: "Australia" },
  { location: "Whitsundays", country: "Australia" },

  // Middle East
  { location: "Dubai", country: "UAE" },
];

function getServiceDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function detectBoatType(type: string): string {
  const t = (type || "").toLowerCase();
  if (/sailboat|sailing|segel/.test(t)) return "sailboat";
  if (/catamaran|katamaran/.test(t)) return "catamaran";
  if (/gulet/.test(t)) return "gulet";
  if (/speedboat/.test(t)) return "speedboat";
  if (/houseboat|hausboot/.test(t)) return "houseboat";
  if (/jet.?ski/.test(t)) return "jet_ski";
  if (/yacht/.test(t)) return "yacht";
  return "motorboat";
}

/** Convert ExtractedListing to charter_boats row */
function listingToBoat(
  listing: ExtractedListing,
  target: ScrapeTarget,
  companyId: string
): Record<string, unknown> {
  return {
    company_id: companyId,
    name: listing.name,
    slug: slugify(`${listing.name}-${target.location}`),
    boat_type: detectBoatType(listing.type),
    brand: listing.brand || null,
    model: listing.model || null,
    year: listing.year || null,
    length_m: listing.length_ft ? Math.round((listing.length_ft / 3.281) * 10) / 10 : null,
    cabins: listing.cabins || null,
    max_guests: listing.guests || null,
    crew_size: listing.crew || 0,
    price_per_day: listing.price_per_day || null,
    price_per_week: listing.price_per_week || null,
    currency: listing.currency || "EUR",
    base_port: listing.port || target.location,
    country: listing.country || target.country,
    region: listing.region || target.region || null,
    features: Array.isArray(listing.features) ? listing.features.slice(0, 20) : [],
    images: listing.image_url ? [listing.image_url] : [],
    description: (listing.description || "").slice(0, 500),
    charter_type: (listing.crew && listing.crew > 0) ? "crewed" : "bareboat",
    license_required: detectBoatType(listing.type) === "sailboat" || detectBoatType(listing.type) === "catamaran",
    status: "active",
    detail_url: listing.source_url,
    source: "auto_scrape",
  };
}

/** Get-or-create a placeholder company for scraped boats */
async function getOrCreateScrapeCompany(
  db: SupabaseClient,
  sourceDomain: string
): Promise<string | null> {
  const slug = slugify(sourceDomain);
  const existingRes = await db
    .from("charter_companies")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  const existing = existingRes.data as { id: string } | null;
  if (existing?.id) return existing.id;

  const createdRes = await db
    .from("charter_companies")
    .insert({
      company_name: sourceDomain
        .replace(/\.(com|de|fr|es|it|net|org)$/, "")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      slug,
      company_type: "charter",
      country: "Worldwide",
      website: `https://${sourceDomain}`,
      verified: false,
      source: "auto_scrape",
    } as Record<string, unknown>)
    .select("id")
    .single();
  const created = createdRes.data as { id: string } | null;
  return created?.id || null;
}

export async function GET(req: NextRequest) {
  // Auth: require secret OR Render's cron user-agent
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.CRON_SECRET || "veliqa-scrape-2024";
  if (secret !== expectedSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceDb();
  if (!db) {
    return Response.json({ error: "DB not configured" }, { status: 500 });
  }

  // Batch size — default 8 per hour, overridable via ?count=N (max 20)
  const countParam = parseInt(req.nextUrl.searchParams.get("count") || "8");
  const batchSize = Math.min(Math.max(1, countParam), 20);

  // startAt: explicit index override (for manual seeding), else use hour-rotation
  const startAtParam = req.nextUrl.searchParams.get("startAt");
  const hour = new Date().getUTCHours();
  const startIdx =
    startAtParam !== null
      ? Math.max(0, parseInt(startAtParam)) % SCRAPE_QUEUE.length
      : (hour * batchSize) % SCRAPE_QUEUE.length;

  const targets: ScrapeTarget[] = [];
  for (let i = 0; i < batchSize; i++) {
    targets.push(SCRAPE_QUEUE[(startIdx + i) % SCRAPE_QUEUE.length]);
  }

  const results: Array<{ target: ScrapeTarget; scraped: number; inserted: number; error?: string }> = [];

  // Scrape all targets in parallel (4 concurrent — avoid rate-limiting platforms)
  const CONCURRENCY = 4;
  const targetBatches: ScrapeTarget[][] = [];
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    targetBatches.push(targets.slice(i, i + CONCURRENCY));
  }

  for (const batch of targetBatches) {
    const batchResults = await Promise.allSettled(
      batch.map((target) => processTarget(target, db))
    );
    for (let i = 0; i < batch.length; i++) {
      const target = batch[i];
      const r = batchResults[i];
      if (r.status === "fulfilled") {
        results.push({ target, ...r.value });
      } else {
        results.push({ target, scraped: 0, inserted: 0, error: String(r.reason) });
      }
    }
  }

  const totalInserted = results.reduce((s, r) => s + r.inserted, 0);
  const totalScraped = results.reduce((s, r) => s + r.scraped, 0);

  // Log to DB
  await db.from("scrape_log").insert({
    targets: targets.map((t) => `${t.location}, ${t.country}`),
    scraped: totalScraped,
    inserted: totalInserted,
    results,
  }).select().single().then(() => {}, () => {});

  return Response.json({
    ok: true,
    batchSize,
    startIdx,
    hour,
    targets: targets.map((t) => `${t.location}, ${t.country}`),
    totalScraped,
    totalInserted,
    results,
  });
}

/** Process a single scrape target — scrape + dedupe + upsert */
async function processTarget(
  target: ScrapeTarget,
  db: SupabaseClient
): Promise<{ scraped: number; inserted: number; error?: string }> {
  try {
    const listings = await scrapeAllPlatforms(
      `${target.location} ${target.country}`,
      target.boatType
    );

    if (listings.length === 0) return { scraped: 0, inserted: 0 };

    let inserted = 0;
    const companyCache = new Map<string, string>();

    for (const listing of listings) {
      let domain = "";
      try {
        domain = new URL(listing.source_url).hostname.replace("www.", "");
      } catch {
        continue;
      }
      if (!domain || !listing.name) continue;

      // Only insert boats with non-category detail URLs
      try {
        const path = new URL(listing.source_url).pathname;
        const segments = path.split("/").filter(Boolean);
        if (segments.length < 2) continue;
        if (/\/(search|results|fleet|browse|category)\/?$/i.test(path)) continue;
      } catch {
        continue;
      }

      let companyId = companyCache.get(domain);
      if (!companyId) {
        const id = await getOrCreateScrapeCompany(db, domain);
        if (!id) continue;
        companyId = id;
        companyCache.set(domain, id);
      }

      const boat = listingToBoat(listing, target, companyId);
      const { error } = await db
        .from("charter_boats")
        .upsert(boat, { onConflict: "company_id,name,boat_type", ignoreDuplicates: false });

      if (!error) inserted++;
    }

    return { scraped: listings.length, inserted };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { scraped: 0, inserted: 0, error: message };
  }
}
