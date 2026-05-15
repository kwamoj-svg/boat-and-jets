import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 300;

/**
 * Scanboat sale-boats scraper.
 *
 * Reads the public sitemap (16k+ boats for sale), fetches detail pages
 * in batches, extracts JSON-LD (schema.org/Vehicle), and upserts into
 * the sale_boats table.
 *
 *   GET /api/cron/scrape-scanboat?secret=...
 *     &offset=0        start index in sitemap (default: auto-rotate by hour)
 *     &count=200       how many detail pages to fetch this run (default 200, max 500)
 */

const SITEMAP_URL = "https://www.scanboat.com/en/sitemap-ads.xml";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const CONCURRENCY = 6;

function getServiceDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

async function fetchText(url: string, timeoutMs = 15000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/xml" },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function detectBoatType(bodyType: string, slug: string): string {
  const t = (bodyType || slug).toLowerCase();
  if (/sailingboat|sailboat|sailing|segel/.test(t)) return "sailboat";
  if (/catamaran|katamaran/.test(t)) return "catamaran";
  if (/gulet/.test(t)) return "gulet";
  if (/inflatable|rib/.test(t)) return "speedboat";
  if (/houseboat|hausboot/.test(t)) return "houseboat";
  if (/yacht/.test(t) && /super|mega/.test(t)) return "superyacht";
  if (/yacht/.test(t)) return "yacht";
  return "motorboat";
}

function mapCondition(schemaCondition: string): string {
  if (/New/i.test(schemaCondition)) return "new";
  if (/Refurbished/i.test(schemaCondition)) return "like_new";
  if (/Used/i.test(schemaCondition)) return "good";
  return "good";
}

interface JsonLdBoat {
  name?: string;
  image?: string;
  brand?: { name?: string };
  material?: string;
  bodyType?: string;
  fuelType?: string;
  productionDate?: string;
  vehicleEngine?: { name?: string };
  offers?: {
    price?: string;
    priceCurrency?: string;
    itemCondition?: string;
    offeredBy?: { name?: string };
    url?: string;
  };
  sku?: string;
}

function parseJsonLd(html: string): JsonLdBoat | null {
  const blocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  if (!blocks) return null;
  for (const block of blocks) {
    const jsonStr = block.replace(/<script[^>]*>/, "").replace(/<\/script>/, "");
    try {
      const d = JSON.parse(jsonStr);
      if (d && typeof d === "object" && d.offers) return d as JsonLdBoat;
    } catch { /* skip */ }
  }
  return null;
}

function extractCountryFromHtml(html: string): string | null {
  const m = html.match(/<meta\s+name="geo\.country"\s+content="([^"]+)"/i)
    || html.match(/<span[^>]*class="[^"]*country[^"]*"[^>]*>([^<]+)/i)
    || html.match(/>\s*Country:\s*<\/[^>]+>\s*<[^>]+>([^<]+)/i)
    || html.match(/Location[:\s]*<[^>]*>([^<,]+)/i);
  return m ? m[1].trim() : null;
}

function extractLengthFromHtml(html: string): number | null {
  const m = html.match(/(?:LOA|Length|Länge)[:\s]*(?:<[^>]*>)?\s*([\d.,]+)\s*(?:m\b|meter)/i)
    || html.match(/>([\d.,]+)\s*(?:m|meter)\s*</i);
  if (m) {
    const v = parseFloat(m[1].replace(",", "."));
    if (v > 2 && v < 200) return Math.round(v * 10) / 10;
  }
  const ft = html.match(/(?:LOA|Length)[:\s]*(?:<[^>]*>)?\s*([\d.,]+)\s*(?:ft|feet|foot)/i);
  if (ft) {
    const v = parseFloat(ft[1].replace(",", ".")) / 3.281;
    if (v > 2 && v < 200) return Math.round(v * 10) / 10;
  }
  return null;
}

function extractLocationFromHtml(html: string): string | null {
  const m = html.match(/(?:Location|Standort|Harbour|Port|Marina)[:\s]*(?:<[^>]*>)*\s*([^<]{3,50})/i);
  return m ? m[1].trim().replace(/\s+/g, " ") : null;
}

function extractImageFromHtml(html: string): string | null {
  const m = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  return m ? m[1] : null;
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET || "veliqa-scrape-2024";
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const count = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get("count") || "200")), 500);

  // 1. Fetch sitemap
  const sitemapXml = await fetchText(SITEMAP_URL, 30000);
  if (!sitemapXml) return NextResponse.json({ error: "Could not fetch sitemap" }, { status: 502 });

  const urls: string[] = [];
  const locMatches = sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g);
  for (const m of locMatches) {
    if (/\/boat-market\/boats\//.test(m[1])) urls.push(m[1].trim());
  }

  if (urls.length === 0) {
    return NextResponse.json({ error: "No boat URLs in sitemap", total: 0 }, { status: 404 });
  }

  // 2. Determine offset — auto-rotate or manual
  const offsetParam = req.nextUrl.searchParams.get("offset");
  const hour = new Date().getUTCHours();
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const offset = offsetParam !== null
    ? Math.max(0, parseInt(offsetParam)) % urls.length
    : ((dayOfYear * 24 + hour) * count) % urls.length;

  const batch = urls.slice(offset, offset + count);
  if (batch.length < count && offset + count > urls.length) {
    batch.push(...urls.slice(0, count - batch.length));
  }

  // 3. Pre-load existing slugs to skip duplicates
  const { data: existingData } = await db
    .from("sale_boats")
    .select("slug")
    .eq("source_domain", "scanboat.com");
  const existingSlugs = new Set<string>(
    (existingData || []).map((r: { slug: string | null }) => r.slug || "")
  );

  let totalFetched = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let lastError: string | null = null;

  // 4. Fetch detail pages in parallel batches
  const batches: string[][] = [];
  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    batches.push(batch.slice(i, i + CONCURRENCY));
  }

  const rows: Record<string, unknown>[] = [];

  for (const urlBatch of batches) {
    const results = await Promise.allSettled(
      urlBatch.map(async (url) => {
        const slug = slugify(`scanboat-${url.split("/").pop() || ""}`);
        if (existingSlugs.has(slug)) {
          totalSkipped++;
          return null;
        }

        const html = await fetchText(url);
        if (!html) return null;
        totalFetched++;

        const ld = parseJsonLd(html);
        if (!ld || !ld.name) return null;

        const price = ld.offers?.price ? parseInt(String(ld.offers.price).replace(/[^0-9]/g, "")) : null;
        const currency = ld.offers?.priceCurrency || "EUR";
        const year = ld.productionDate ? parseInt(ld.productionDate.slice(0, 4)) : null;
        const brandName = ld.brand?.name?.replace(/\s+(International|Yachts?|Boats?|Marine)$/i, "") || null;

        const bodyType = ld.bodyType || "";
        const boatType = detectBoatType(bodyType, url);

        const model = ld.name.replace(new RegExp(`^${brandName}\\s*`, "i"), "").trim() || null;
        const condition = ld.offers?.itemCondition ? mapCondition(ld.offers.itemCondition) : "good";
        const imageUrl = ld.image || extractImageFromHtml(html);
        const location = extractLocationFromHtml(html);
        const country = extractCountryFromHtml(html);
        const length_m = extractLengthFromHtml(html);
        const fuelType = ld.fuelType || null;
        const engineName = ld.vehicleEngine?.name || null;
        const seller = ld.offers?.offeredBy?.name || null;

        existingSlugs.add(slug);

        return {
          name: ld.name.slice(0, 200),
          slug,
          boat_type: boatType,
          brand: brandName,
          model: model?.slice(0, 100),
          year: year && year >= 1950 && year <= 2027 ? year : null,
          length_m,
          sale_price: price && price >= 500 ? price : 0,
          currency,
          price_negotiable: !price || price < 500,
          condition,
          location,
          country,
          fuel_type: fuelType,
          engine_type: engineName,
          features: [],
          images: imageUrl ? [imageUrl] : [],
          description: seller ? `${ld.name} — ${seller}` : `${ld.name} — scanboat.com`,
          detail_url: url,
          source_domain: "scanboat.com",
          source: "marketplace",
          status: "active",
          verified: false,
          material: ld.material || null,
        };
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        rows.push(r.value);
      }
    }
  }

  // 5. Insert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const { error } = await db.from("sale_boats").upsert(chunk, { onConflict: "slug", ignoreDuplicates: false });
    if (!error) {
      totalInserted += chunk.length;
    } else {
      if (!lastError) lastError = error.message;
      for (const r of chunk) {
        const { error: e2 } = await db.from("sale_boats").upsert(r, { onConflict: "slug", ignoreDuplicates: false });
        if (!e2) totalInserted++;
      }
    }
  }

  // 6. Log
  await db.from("scrape_log").insert({
    targets: ["scanboat.com"],
    scraped: totalFetched,
    inserted: totalInserted,
    results: { offset, count, skipped: totalSkipped, lastError },
  }).then(() => {}, () => {});

  return NextResponse.json({
    ok: true,
    platform: "scanboat",
    sitemapTotal: urls.length,
    offset,
    batchSize: batch.length,
    fetched: totalFetched,
    skipped: totalSkipped,
    inserted: totalInserted,
    lastError,
  });
}
