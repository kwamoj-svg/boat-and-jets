import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 300;

/**
 * TheYachtMarket.com scraper.
 *
 * Reads boat sitemaps (sitemapboats1–5.xml, ~750 boats total),
 * fetches detail pages, extracts Schema.org microdata + OG tags,
 * and upserts into the sale_boats table.
 *
 *   GET /api/cron/scrape-yachtmarket?secret=...
 *     &count=200       how many detail pages to fetch this run (default 200, max 500)
 *     &offset=0        start index (default: auto-rotate by hour)
 */

const SITEMAP_URLS = [
  "https://www.theyachtmarket.com/sitemapboats1.xml",
  "https://www.theyachtmarket.com/sitemapboats2.xml",
  "https://www.theyachtmarket.com/sitemapboats3.xml",
  "https://www.theyachtmarket.com/sitemapboats4.xml",
  "https://www.theyachtmarket.com/sitemapboats5.xml",
];
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

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta\\s+property="${property}"\\s+content="([^"]*)"`, "i"),
    new RegExp(`<meta\\s+content="([^"]*)"\\s+property="${property}"`, "i"),
    new RegExp(`<meta\\s+name="${property}"\\s+content="([^"]*)"`, "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

function extractItemprop(html: string, prop: string): string | null {
  const m = html.match(new RegExp(`itemprop="${prop}"\\s+content="([^"]*)"`, "i"))
    || html.match(new RegExp(`<meta\\s+itemprop="${prop}"\\s+content="([^"]*)"`, "i"));
  return m ? m[1].trim() : null;
}

function extractAfterStrong(html: string, label: string): string | null {
  const re = new RegExp(`<strong>${label}</strong>\\s*<br\\s*/?>\\s*([^<]+)`, "i");
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

function detectBoatType(category: string, name: string): string {
  const t = (category + " " + name).toLowerCase();
  if (/sail/.test(t)) return "sailboat";
  if (/catamaran/.test(t)) return "catamaran";
  if (/gulet/.test(t)) return "gulet";
  if (/inflatable|rib\b/.test(t)) return "speedboat";
  if (/houseboat/.test(t)) return "houseboat";
  if (/super\s?yacht|mega/.test(t)) return "superyacht";
  if (/yacht/.test(t)) return "yacht";
  if (/power|motor/.test(t)) return "motorboat";
  return "motorboat";
}

function mapCondition(itemCondition: string): string {
  if (/New/i.test(itemCondition)) return "new";
  if (/Refurbished/i.test(itemCondition)) return "like_new";
  return "good";
}

function parseLength(lengthStr: string | null): number | null {
  if (!lengthStr) return null;
  const m = lengthStr.match(/([\d.,]+)\s*(?:metres|meters|m\b)/i);
  if (m) {
    const v = parseFloat(m[1].replace(",", "."));
    if (v > 2 && v < 200) return Math.round(v * 10) / 10;
  }
  const ft = lengthStr.match(/([\d.,]+)\s*(?:ft|feet|foot)/i);
  if (ft) {
    const v = parseFloat(ft[1].replace(",", ".")) / 3.281;
    if (v > 2 && v < 200) return Math.round(v * 10) / 10;
  }
  return null;
}

interface ParsedBoat {
  name: string;
  slug: string;
  boat_type: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  length_m: number | null;
  sale_price: number;
  currency: string;
  price_negotiable: boolean;
  condition: string;
  location: string | null;
  country: string | null;
  fuel_type: string | null;
  engine_type: string | null;
  features: string[];
  images: string[];
  description: string;
  detail_url: string;
  source_domain: string;
  source: string;
  status: string;
  verified: boolean;
  material: string | null;
}

function parsePage(html: string, url: string): ParsedBoat | null {
  const brand = extractItemprop(html, "brand") || extractItemprop(html, "manufacturer");
  const model = extractItemprop(html, "model");
  const name = extractMeta(html, "og:title") || (brand && model ? `${brand} ${model}` : null);
  if (!name) return null;

  const priceStr = extractMeta(html, "og:price:amount");
  const currency = extractMeta(html, "og:price:currency") || "EUR";
  const price = priceStr ? parseInt(priceStr.replace(/[^0-9]/g, "")) : 0;

  const yearStr = extractAfterStrong(html, "Year");
  const year = yearStr ? parseInt(yearStr) : null;

  const condLink = html.match(/itemprop="itemCondition"\s+href="([^"]+)"/i);
  const condition = condLink ? mapCondition(condLink[1]) : "good";

  const category = extractAfterStrong(html, "Category") || "";
  const boatType = detectBoatType(category, name);

  const lengthStr = extractAfterStrong(html, "Length overall");
  const length_m = parseLength(lengthStr);

  const locationRaw = extractAfterStrong(html, "Location");
  const countryMatch = html.match(/itemprop="countryOfLastProcessing">([^<]+)/i);
  const country = countryMatch ? countryMatch[1].trim() : null;
  const location = locationRaw ? locationRaw.replace(/,\s*$/, "").trim() : null;

  const imgMatch = html.match(/itemprop="image"[^>]*src="([^"]+)"/i);
  const mainImg = imgMatch ? (imgMatch[1].startsWith("//") ? "https:" + imgMatch[1] : imgMatch[1]) : null;

  const images: string[] = [];
  if (mainImg) images.push(mainImg);
  const thumbMatches = html.matchAll(/src="(\/\/cdnx\.theyachtmarket\.com\/img\/[^"]+)"/g);
  for (const tm of thumbMatches) {
    const full = "https:" + tm[1];
    if (!images.includes(full) && images.length < 10) {
      const large = full.replace(/\/img\/(\d+)\/\d+\//, "/img/$1/2/");
      if (!images.includes(large)) images.push(large);
    }
  }

  const hullMatch = extractAfterStrong(html, "Hull material");
  const fuelMatch = extractAfterStrong(html, "Fuel type");

  const engineMatch = html.match(/<h5>Engines<\/h5>\s*<ul><li>([^<]+)/i);
  const engineType = engineMatch ? engineMatch[1].trim() : null;

  const sellerMatch = html.match(/Broker\/Dealer Information[\s\S]*?<h4[^>]*>([^<]+)/i);
  const seller = sellerMatch ? sellerMatch[1].trim() : null;

  const idMatch = url.match(/id(\d+)/);
  const slug = slugify(`tym-${idMatch ? idMatch[1] : ""}-${(brand || "").slice(0, 20)}-${(model || "").slice(0, 30)}`);

  return {
    name: name.slice(0, 200),
    slug,
    boat_type: boatType,
    brand: brand || null,
    model: model || null,
    year: year && year >= 1950 && year <= 2027 ? year : null,
    length_m,
    sale_price: price && price >= 100 ? price : 0,
    currency,
    price_negotiable: !price || price < 100,
    condition,
    location,
    country,
    fuel_type: fuelMatch || null,
    engine_type: engineType,
    features: [],
    images,
    description: seller ? `${name} — ${seller}` : `${name} — theyachtmarket.com`,
    detail_url: url,
    source_domain: "theyachtmarket.com",
    source: "marketplace",
    status: "active",
    verified: false,
    material: hullMatch || null,
  };
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

  // 1. Fetch all boat sitemaps
  const allUrls: string[] = [];
  const sitemapResults = await Promise.allSettled(
    SITEMAP_URLS.map(async (sUrl) => {
      const xml = await fetchText(sUrl, 20000);
      if (!xml) return [];
      const locs: string[] = [];
      const matches = xml.matchAll(/<loc>([^<]+)<\/loc>/g);
      for (const m of matches) {
        if (/\/boats-for-sale\//.test(m[1])) locs.push(m[1].trim());
      }
      return locs;
    })
  );
  for (const r of sitemapResults) {
    if (r.status === "fulfilled") allUrls.push(...r.value);
  }

  if (allUrls.length === 0) {
    return NextResponse.json({ error: "No boat URLs in sitemaps", total: 0 }, { status: 404 });
  }

  // 2. Determine offset
  const offsetParam = req.nextUrl.searchParams.get("offset");
  const hour = new Date().getUTCHours();
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const offset = offsetParam !== null
    ? Math.max(0, parseInt(offsetParam)) % allUrls.length
    : ((dayOfYear * 24 + hour) * count) % allUrls.length;

  const batch = allUrls.slice(offset, offset + count);
  if (batch.length < count && offset + count > allUrls.length) {
    batch.push(...allUrls.slice(0, count - batch.length));
  }

  // 3. Pre-load existing slugs
  const { data: existingData } = await db
    .from("sale_boats")
    .select("slug")
    .eq("source_domain", "theyachtmarket.com");
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
        const idMatch = url.match(/id(\d+)/);
        const tempSlug = slugify(`tym-${idMatch ? idMatch[1] : url.split("/").pop() || ""}`);
        if (existingSlugs.has(tempSlug)) {
          totalSkipped++;
          return null;
        }

        const html = await fetchText(url);
        if (!html) return null;
        totalFetched++;

        const boat = parsePage(html, url);
        if (!boat) return null;

        if (existingSlugs.has(boat.slug)) {
          totalSkipped++;
          return null;
        }
        existingSlugs.add(boat.slug);
        return boat;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        rows.push(r.value as unknown as Record<string, unknown>);
      }
    }
  }

  // 5. Upsert in batches of 50
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
    targets: ["theyachtmarket.com"],
    scraped: totalFetched,
    inserted: totalInserted,
    results: { offset, count, skipped: totalSkipped, lastError, sitemapTotal: allUrls.length },
  }).then(() => {}, () => {});

  return NextResponse.json({
    ok: true,
    platform: "theyachtmarket",
    sitemapTotal: allUrls.length,
    offset,
    batchSize: batch.length,
    fetched: totalFetched,
    skipped: totalSkipped,
    inserted: totalInserted,
    lastError,
  });
}
