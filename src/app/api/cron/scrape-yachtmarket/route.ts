import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Scrape TheYachtMarket.com sitemap → sale_boats.
 *
 * Sitemap index → 5 sub-sitemaps (~5000 listings each = 25k total).
 * Each <url><loc> looks like:
 *   https://www.theyachtmarket.com/en/boats-for-sale/{brand}/{model}/id{N}/
 *   https://www.theyachtmarket.com/en/boats-for-sale/{N}/         (bare-id, skip — no brand/model in URL)
 *
 * Initial import inserts shell rows from URL structure (name/brand/model,
 * sale_price=0, price_negotiable=true, source=marketplace). A separate
 * backfill enriches with real price + cover image from the detail page.
 *
 *  GET /api/cron/scrape-yachtmarket?index=1&count=500
 *  Header: x-cron-secret: <secret>
 */

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const KNOWN_BOAT_TYPES_BY_BRAND: Record<string, string> = {
  lagoon: "catamaran",
  bali: "catamaran",
  fountaine: "catamaran",
  nautitech: "catamaran",
  leopard: "catamaran",
  catana: "catamaran",
  dragonfly: "catamaran",
  beneteau: "sailboat",
  bavaria: "sailboat",
  jeanneau: "sailboat",
  hanse: "sailboat",
  dufour: "sailboat",
  elan: "sailboat",
  "x-yachts": "sailboat",
  hallberg: "sailboat",
  oyster: "sailboat",
  contest: "sailboat",
  najad: "sailboat",
  princess: "yacht",
  sunseeker: "yacht",
  azimut: "yacht",
  ferretti: "yacht",
  pershing: "yacht",
  fairline: "yacht",
  riva: "yacht",
  sealine: "yacht",
  "sea-ray": "motorboat",
  "sea ray": "motorboat",
  searay: "motorboat",
  quicksilver: "motorboat",
  bayliner: "motorboat",
  nimbus: "motorboat",
  jeranneau: "motorboat",
  rib: "motorboat",
  zodiac: "motorboat",
  capelli: "motorboat",
  sacs: "motorboat",
  axopar: "motorboat",
  brabus: "motorboat",
};

function getServiceDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/xml" },
      redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function titleCase(s: string) {
  return s
    .split(/[-_\s]+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ")
    .trim();
}

/**
 * Parse a TheYachtMarket URL like:
 *   /en/boats-for-sale/jeanneau/cap-camarat-6-5-br/id3081664/
 * → { brand: "Jeanneau", model: "Cap Camarat 6 5 BR", externalId: "3081664" }
 *
 * Returns null for bare-id URLs (no brand/model info).
 */
function parseUrl(url: string): {
  brand: string;
  model: string;
  externalId: string;
} | null {
  try {
    const u = new URL(url);
    const m = /^\/(?:en|de|fr|es|it|nl)\/(?:boats-for-sale|zum-verkauf-stehende-boote|bateaux-a-vendre|barcos-en-venta)\/([^/]+)\/([^/]+)\/id(\d+)\/?$/i.exec(
      u.pathname
    );
    if (!m) return null;
    const brand = titleCase(m[1]);
    const model = titleCase(m[2]);
    const externalId = m[3];
    if (!brand || !model || brand.length < 2 || model.length < 1) return null;
    return { brand, model, externalId };
  } catch {
    return null;
  }
}

function detectBoatType(brand: string, model: string): string {
  const b = brand.toLowerCase();
  const m = model.toLowerCase();
  if (KNOWN_BOAT_TYPES_BY_BRAND[b]) return KNOWN_BOAT_TYPES_BY_BRAND[b];
  if (/\bcat(?:amaran)?\b/.test(m)) return "catamaran";
  if (/\bsail|sloop|ketch|schooner\b/.test(m)) return "sailboat";
  if (/\bmotor|cruiser|express|sport\b/.test(m)) return "motorboat";
  if (/\byacht\b/.test(m)) return "yacht";
  return "motorboat";
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET || "veliqa-scrape-2024";
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const index = parseInt(req.nextUrl.searchParams.get("index") || "1", 10);
  const count = Math.min(Math.max(50, parseInt(req.nextUrl.searchParams.get("count") || "500", 10)), 2000);

  const db = getServiceDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const subSitemapUrl = `https://www.theyachtmarket.com/sitemapboats${index}.xml`;
  const xml = await fetchText(subSitemapUrl);
  if (!xml) {
    return NextResponse.json({ error: `Could not fetch ${subSitemapUrl}` }, { status: 502 });
  }

  // Extract listing URLs (English variants only — multilingual hreflang entries
  // are siblings inside the same <url> block but we dedupe by externalId).
  const urlMatches = xml.matchAll(/<loc>(https:\/\/www\.theyachtmarket\.com\/en\/boats-for-sale\/[^<]+)<\/loc>/gi);
  const seen = new Set<string>();
  const rows: Array<Record<string, unknown>> = [];
  let scanned = 0;

  for (const m of urlMatches) {
    scanned++;
    if (rows.length >= count) break;

    const url = m[1].trim();
    const parsed = parseUrl(url);
    if (!parsed) continue;
    if (seen.has(parsed.externalId)) continue;
    seen.add(parsed.externalId);

    const boatType = detectBoatType(parsed.brand, parsed.model);
    const name = `${parsed.brand} ${parsed.model}`.replace(/\s+/g, " ").trim();
    const slug = slugify(`${name}-tym-${parsed.externalId}`);

    rows.push({
      name,
      slug,
      boat_type: boatType,
      brand: parsed.brand,
      model: parsed.model,
      year: null,
      length_m: null,
      sale_price: 0,
      currency: "GBP",
      location: null,
      country: null,
      condition: "good",
      features: [],
      images: [],
      description: `${name} listed on TheYachtMarket. Price and details on listing page.`,
      detail_url: url,
      source_domain: "theyachtmarket.com",
      source: "marketplace",
      price_negotiable: true,
      status: "active",
      verified: false,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      sitemap: subSitemapUrl,
      scanned,
      inserted: 0,
      message: "No parseable listing URLs in this sub-sitemap",
    });
  }

  // Bulk upsert in chunks
  let inserted = 0;
  const CHUNK = 100;
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error, count: cnt } = await db
      .from("sale_boats")
      .upsert(slice, { onConflict: "slug", ignoreDuplicates: false, count: "exact" });
    if (error) {
      if (errors.length < 5) errors.push(error.message);
    } else {
      inserted += cnt ?? slice.length;
    }
  }

  return NextResponse.json({
    ok: true,
    sitemap: subSitemapUrl,
    scanned,
    parsed: rows.length,
    inserted,
    errors,
  });
}
