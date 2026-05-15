import { NextRequest, NextResponse } from "next/server";
import { checkCronKillSwitch } from "@/lib/cron-guard";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 300;

/**
 * Boataround-only bulk scraper. Reads the public sitemap index, picks
 * one or more sub-sitemaps per run, parses every <url> entry (which
 * conveniently includes <image:image><image:loc> with a cover photo),
 * and inserts each boat into charter_boats with source='boataround'.
 *
 * Affiliate-ready: when BOATAROUND_AFFILIATE_ID env var is set we
 * append tracking params to every detail URL.
 *
 *  GET /api/cron/scrape-boataround
 *    ?lang=de|en|fr|es|it (default de)
 *    ?type=catamaran|sailing|motor (default catamaran)
 *    ?index=N             specific sub-sitemap index 1..N
 *    ?count=N             how many sub-sitemaps to process in this run (default 1)
 *
 * Each DE catamaran sub-sitemap has ~500 boats; sailing+motor similar.
 * 27 DE sitemaps total → 13k+ DE boats. Multi-language → 50k+ globally.
 */

const SITEMAP_INDEX = "https://www.boataround.com/sitemap.xml";

const TYPE_GROUPS: Record<string, string> = {
  catamaran: "catamaran_power_catamaran_houseboat",
  sailing: "sailing_yacht",
  motor: "motor_yacht_motor_boat_gulet",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

function getServiceDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function fetchText(url: string, timeoutMs = 20000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "application/xml,text/xml" },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const KNOWN_BRANDS = [
  "Lagoon", "Bali", "Fountaine Pajot", "Leopard", "Nautitech", "Sunreef",
  "Bavaria", "Beneteau", "Jeanneau", "Dufour", "Hanse", "Elan", "X-Yachts",
  "Catalina", "Hallberg Rassy", "Salona", "Oceanis",
  "Sun Odyssey", "Cyclades", "Sun Loft", "Sun Fast", "Cruiser",
  "Sunseeker", "Princess", "Azimut", "Ferretti", "Riva", "Pershing",
  "Fairline", "Galeon", "Prestige", "Absolute", "Cranchi", "Sea Ray",
  "Quicksilver", "Bayliner", "Marine Atlantic", "Adriana",
  "Gulet", "Goelette", "Caicco",
];

interface SitemapEntry {
  url: string;
  imageUrl: string | null;
  lastmod: string | null;
  slug: string;
}

function parseSitemapXml(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  // Match each <url>...</url> block
  const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
  for (const block of urlBlocks) {
    const locMatch = /<loc>([^<]+)<\/loc>/.exec(block);
    if (!locMatch) continue;
    const url = locMatch[1].trim();
    // Skip non-boat pages (some sitemaps mix in category/search pages)
    if (!/\/boot\/|\/boat\/|\/loue\/|\/yate\/|\/barca\//.test(url)) continue;
    const imgMatch = /<image:loc>([^<]+)<\/image:loc>/.exec(block);
    const lastMatch = /<lastmod>([^<]+)<\/lastmod>/.exec(block);
    const slug = url.split("/").filter(Boolean).pop() || "";
    entries.push({
      url,
      imageUrl: imgMatch ? imgMatch[1].trim() : null,
      lastmod: lastMatch ? lastMatch[1].trim() : null,
      slug,
    });
  }
  return entries;
}

function extractBrandModel(slug: string): { brand: string | null; model: string | null; name: string } {
  // slug format: lagoon-450-f-majestic
  const words = slug.split("-");
  if (words.length === 0) return { brand: null, model: null, name: slug };

  // Try to find a known brand at the start (1 or 2 words)
  let brand: string | null = null;
  let consumed = 0;
  const firstTwo = words.slice(0, 2).join(" ").toLowerCase();
  const first = words[0].toLowerCase();

  for (const b of KNOWN_BRANDS) {
    const bl = b.toLowerCase();
    if (firstTwo === bl) { brand = b; consumed = 2; break; }
    if (first === bl) { brand = b; consumed = 1; break; }
  }
  if (!brand) {
    brand = words[0].replace(/\b\w/g, (c) => c.toUpperCase());
    consumed = 1;
  }

  // Next 1-3 words look like model (numbers or short tokens)
  let modelEnd = consumed;
  for (let i = consumed; i < Math.min(consumed + 3, words.length); i++) {
    const w = words[i];
    if (/^\d/.test(w) || (w.length <= 3 && /^[a-z]/.test(w))) modelEnd = i + 1;
    else break;
  }
  const model = words.slice(consumed, modelEnd).join(" ");
  const rest = words.slice(modelEnd).join(" ");
  const properModel = model ? model.replace(/\b\w/g, (c) => c.toUpperCase()) : null;
  const properRest = rest ? rest.replace(/\b\w/g, (c) => c.toUpperCase()) : "";
  const name = [brand, properModel, properRest].filter(Boolean).join(" ").trim();
  return { brand, model: properModel, name: name || slug };
}

function buildAffiliateUrl(url: string): string {
  const id = process.env.BOATAROUND_AFFILIATE_ID;
  if (!id) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", "veliqa");
    u.searchParams.set("utm_medium", "affiliate");
    u.searchParams.set("aff", id);
    return u.toString();
  } catch {
    return url;
  }
}

function detectBoatType(typeGroup: string, slug: string): string {
  if (typeGroup === "catamaran") {
    if (/houseboat|hausboot|peniche/.test(slug)) return "houseboat";
    if (/power[-_]?cat|moteur/.test(slug)) return "catamaran";
    return "catamaran";
  }
  if (typeGroup === "sailing") return "sailboat";
  if (typeGroup === "motor") {
    if (/gulet|goelette|caicco/.test(slug)) return "gulet";
    if (/motor[-_]?yacht/.test(slug)) return "yacht";
    return "motorboat";
  }
  return "motorboat";
}

async function getBoataroundCompany(db: SupabaseClient): Promise<string | null> {
  const slug = "boataround";
  const existing = await db.from("charter_companies").select("id").eq("slug", slug).maybeSingle();
  if (existing.data) return (existing.data as { id: string }).id;
  const created = await db
    .from("charter_companies")
    .insert({
      company_name: "Boataround",
      slug,
      company_type: "charter",
      country: "Worldwide",
      website: "https://www.boataround.com",
      verified: true,
      featured: true,
      description: "Globale Charter-Plattform — über 25.000 Boote in 60+ Ländern.",
      services: ["bareboat", "skippered", "day_charter", "week_charter"],
      languages: ["en", "de", "fr", "es", "it", "cz", "pl", "hr", "sk"],
      source: "boataround_sitemap",
    } as Record<string, unknown>)
    .select("id")
    .single();
  return (created.data as { id: string } | null)?.id ?? null;
}

export async function GET(req: NextRequest) {
  const kill = checkCronKillSwitch(req.nextUrl.searchParams);
  if (kill) return kill;
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET || "veliqa-scrape-2024";
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const lang = (req.nextUrl.searchParams.get("lang") || "de").toLowerCase();
  const typeKey = (req.nextUrl.searchParams.get("type") || "catamaran").toLowerCase();
  const typeGroup = TYPE_GROUPS[typeKey] || TYPE_GROUPS.catamaran;
  const count = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get("count") || "1")), 5);
  const startIdx = Math.max(1, parseInt(req.nextUrl.searchParams.get("index") || "1"));

  // Fetch sitemap index
  const indexXml = await fetchText(SITEMAP_INDEX);
  if (!indexXml) return NextResponse.json({ error: "Could not fetch sitemap index" }, { status: 502 });

  // Find matching sub-sitemap URLs
  const subMatches = Array.from(
    indexXml.matchAll(/<loc>([^<]*sitemap_[^<]+\.xml)<\/loc>/g)
  ).map((m) => m[1]);
  const matching = subMatches
    .filter((u) => u.includes(`sitemap_${lang}_${typeGroup}_`))
    .sort();

  if (matching.length === 0) {
    return NextResponse.json({
      error: "No matching sub-sitemaps",
      lang,
      type: typeKey,
      hint: `Pattern: sitemap_${lang}_${typeGroup}_*`,
    }, { status: 404 });
  }

  const companyId = await getBoataroundCompany(db);
  if (!companyId) return NextResponse.json({ error: "Could not init Boataround company" }, { status: 500 });

  // Pre-load existing slugs to avoid duplicates (within boataround_sitemap source)
  const existing = await db
    .from("charter_boats")
    .select("slug")
    .eq("source", "boataround_sitemap");
  const existingSlugs = new Set<string>(
    ((existing.data as { slug: string | null }[] | null) || []).map((r) => r.slug || "")
  );

  const processed: string[] = [];
  let totalEntries = 0;
  let totalInserted = 0;
  let lastError: string | null = null;

  // Process `count` sub-sitemaps starting at `startIdx`
  const toProcess = matching.slice(startIdx - 1, startIdx - 1 + count);
  for (const sitemapUrl of toProcess) {
    processed.push(sitemapUrl);
    const xml = await fetchText(sitemapUrl);
    if (!xml) continue;
    const entries = parseSitemapXml(xml);
    totalEntries += entries.length;

    // Build rows
    const rows: Record<string, unknown>[] = [];
    for (const e of entries) {
      const slug = `boataround-${e.slug}`;
      if (existingSlugs.has(slug)) continue;
      const { brand, model, name } = extractBrandModel(e.slug);
      rows.push({
        company_id: companyId,
        name: name.slice(0, 200),
        slug,
        boat_type: detectBoatType(typeKey, e.slug),
        brand,
        model,
        currency: "EUR",
        features: [],
        images: e.imageUrl ? [e.imageUrl] : [],
        description: `${name} — charter via Boataround.`,
        charter_type: "bareboat",
        status: "active",
        detail_url: buildAffiliateUrl(e.url),
        source: "boataround_sitemap",
      });
      existingSlugs.add(slug);
    }

    if (rows.length === 0) continue;

    // Insert in batches of 100
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await db.from("charter_boats").insert(batch);
      if (!error) totalInserted += batch.length;
      else {
        if (!lastError) lastError = error.message;
        // fallback row-by-row
        for (const r of batch) {
          const { error: e2 } = await db.from("charter_boats").insert(r);
          if (!e2) totalInserted++;
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    platform: "boataround",
    lang,
    type: typeKey,
    typeGroup,
    sitemapsAvailable: matching.length,
    processed: processed.map((p) => p.split("/").pop()),
    totalEntries,
    totalInserted,
    lastError,
  });
}
