import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 300; // 5 minutes

/**
 * Samboat-only bulk scraper — pulls the full product sitemap and
 * imports every detail URL as a charter_boats row.
 *
 * Designed for the upcoming Samboat affiliate program.
 *
 * Trigger:  GET /api/cron/scrape-samboat
 *           Header: x-cron-secret: <secret>
 *           ?limit=N   max boats to insert this run (default 500, max 5000)
 *           ?skip=N    skip first N matching URLs (resume support)
 *           ?lang=de|en|fr|es|it  pick a sitemap (default de)
 *           ?country=X  optional country filter
 */

const SITEMAPS: Record<string, string> = {
  de: "https://www.samboat.de/sitemap_de_product_listings.xml",
  en: "https://www.samboat.com/sitemap_en_product_listings.xml",
  fr: "https://www.samboat.fr/sitemap_fr_product_listings.xml",
  es: "https://www.samboat.es/sitemap_es_product_listings.xml",
  it: "https://www.samboat.it/sitemap_it_product_listings.xml",
};

const HOST_BY_LANG: Record<string, string> = {
  de: "www.samboat.de",
  en: "www.samboat.com",
  fr: "www.samboat.fr",
  es: "www.samboat.es",
  it: "www.samboat.it",
};

const PATH_PREFIX_BY_LANG: Record<string, string> = {
  de: "/boot-mieten/",
  en: "/boat-rental/",
  fr: "/location-bateau/",
  es: "/alquiler-barcos/",
  it: "/noleggio-barche/",
};

// Map Samboat type slugs to our DB enum
const TYPE_MAP: Record<string, string> = {
  segelboot: "sailboat",
  sailboat: "sailboat",
  voilier: "sailboat",
  velero: "sailboat",
  barca_a_vela: "sailboat",
  motorboot: "motorboat",
  motor_boat: "motorboat",
  motorboat: "motorboat",
  bateau_a_moteur: "motorboat",
  lancha: "motorboat",
  barca_a_motore: "motorboat",
  katamaran: "catamaran",
  catamaran: "catamaran",
  catamaran_a_voile: "catamaran",
  katamaran_a_moteur: "catamaran",
  gulet: "gulet",
  goelette: "gulet",
  schlauchboot: "speedboat",
  rib: "speedboat",
  semi_rigide: "speedboat",
  semirigide: "speedboat",
  hausboot: "houseboat",
  houseboat: "houseboat",
  peniche: "houseboat",
  jetski: "jet_ski",
  jet_ski: "jet_ski",
  yacht: "yacht",
  superyacht: "superyacht",
};

// Common Samboat cities → country
const CITY_COUNTRY: Record<string, string> = {
  // Germany
  "berlin": "Germany", "hamburg": "Germany", "muenchen": "Germany",
  "frankfurt": "Germany", "potsdam": "Germany", "rostock": "Germany",
  "kiel": "Germany", "lubeck": "Germany", "stralsund": "Germany",
  // Spain
  "palma-de-mallorca": "Spain", "mallorca": "Spain", "ibiza": "Spain",
  "menorca": "Spain", "barcelona": "Spain", "valencia": "Spain",
  "alicante": "Spain", "marbella": "Spain", "denia": "Spain",
  "gran-canaria": "Spain", "tenerife": "Spain", "formentera": "Spain",
  // Croatia
  "split": "Croatia", "dubrovnik": "Croatia", "zadar": "Croatia",
  "pula": "Croatia", "sibenik": "Croatia", "trogir": "Croatia",
  "rovinj": "Croatia", "hvar": "Croatia", "korcula": "Croatia",
  // Greece
  "athen": "Greece", "athens": "Greece", "mykonos": "Greece",
  "santorini": "Greece", "rhodos": "Greece", "rhodes": "Greece",
  "korfu": "Greece", "corfu": "Greece", "kreta": "Greece",
  "crete": "Greece", "lefkada": "Greece", "kos": "Greece",
  // Italy
  "neapel": "Italy", "naples": "Italy", "sardinien": "Italy",
  "sardinia": "Italy", "sizilien": "Italy", "sicily": "Italy",
  "olbia": "Italy", "capri": "Italy", "amalfi": "Italy",
  "genua": "Italy", "genoa": "Italy", "ligurien": "Italy",
  // France
  "cannes": "France", "nizza": "France", "nice": "France",
  "saint-tropez": "France", "marseille": "France", "korsika": "France",
  "corsica": "France", "ajaccio": "France", "monaco": "Monaco",
  // Turkey
  "bodrum": "Turkey", "marmaris": "Turkey", "fethiye": "Turkey",
  "antalya": "Turkey", "gocek": "Turkey",
  // Other
  "tivat": "Montenegro", "kotor": "Montenegro",
  "valletta": "Malta", "amsterdam": "Netherlands",
  "stockholm": "Sweden", "miami": "USA", "dubai": "UAE",
  "phuket": "Thailand", "langkawi": "Malaysia", "bali": "Indonesia",
};

function getServiceDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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

function titleCase(s: string): string {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

interface ParsedUrl {
  url: string;
  city: string;
  typeSlug: string;
  citySlug: string;
}

function parseSamboatUrl(url: string, lang: string): ParsedUrl | null {
  const prefix = PATH_PREFIX_BY_LANG[lang];
  const host = HOST_BY_LANG[lang];
  if (!url.includes(host) || !url.includes(prefix)) return null;
  const path = url.split(prefix)[1];
  if (!path) return null;
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return {
    url,
    citySlug: parts[0],
    typeSlug: parts[1],
    city: titleCase(decodeURIComponent(parts[0])),
  };
}

/** Build an affiliate-ready Samboat URL by appending a tracking param.
 *  Placeholder for now — when the affiliate program activates, set
 *  process.env.SAMBOAT_AFFILIATE_ID. */
function buildAffiliateUrl(url: string): string {
  const id = process.env.SAMBOAT_AFFILIATE_ID;
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

/** Get or create the Samboat "company" row */
async function getSamboatCompany(db: SupabaseClient): Promise<{ id: string | null; error: string | null }> {
  const slug = "samboat";
  const existing = await db
    .from("charter_companies")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing.data) return { id: (existing.data as { id: string }).id, error: null };

  const created = await db
    .from("charter_companies")
    .insert({
      company_name: "Samboat",
      slug,
      company_type: "charter",
      country: "Worldwide",
      website: "https://www.samboat.de",
      verified: true,
      featured: true,
      description: "Europas führende Charter-Plattform — über 50.000 Boote weltweit.",
      services: ["bareboat", "skippered", "day_charter", "week_charter"],
      languages: ["de", "en", "fr", "es", "it"],
      source: "samboat_sitemap",
    } as Record<string, unknown>)
    .select("id")
    .single();
  if (created.error) {
    return { id: null, error: created.error.message };
  }
  return { id: (created.data as { id: string } | null)?.id ?? null, error: null };
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET || "veliqa-scrape-2024";
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const lang = (req.nextUrl.searchParams.get("lang") || "de").toLowerCase();
  const sitemapUrl = SITEMAPS[lang] || SITEMAPS.de;
  const limit = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "500")), 5000);
  const skip = Math.max(0, parseInt(req.nextUrl.searchParams.get("skip") || "0"));
  const countryFilter = req.nextUrl.searchParams.get("country");

  const { id: companyId, error: companyErr } = await getSamboatCompany(db);
  if (!companyId) {
    return NextResponse.json({
      error: "Could not init Samboat company row",
      detail: companyErr,
      hint: companyErr?.includes("row-level security")
        ? "Run admin-fix-rls.sql or set SUPABASE_SERVICE_ROLE_KEY"
        : null,
    }, { status: 500 });
  }

  // Stream sitemap & extract URLs
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 60000);
  let html = "";
  try {
    const res = await fetch(sitemapUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 VELIQA-Scraper/1.0",
        Accept: "application/xml,text/xml",
      },
    });
    clearTimeout(t);
    if (!res.ok) {
      return NextResponse.json({ error: `Sitemap fetch failed ${res.status}` }, { status: 500 });
    }
    html = await res.text();
  } catch (err) {
    clearTimeout(t);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  // Extract every <loc> URL
  const locRe = /<loc>([^<]+)<\/loc>/g;
  const allUrls: string[] = [];
  let m;
  while ((m = locRe.exec(html)) !== null) {
    if (m[1].includes(PATH_PREFIX_BY_LANG[lang])) allUrls.push(m[1]);
  }

  // Apply skip + parse + filter
  const candidates: ParsedUrl[] = [];
  for (let i = skip; i < allUrls.length && candidates.length < limit; i++) {
    const parsed = parseSamboatUrl(allUrls[i], lang);
    if (!parsed) continue;
    if (countryFilter) {
      const country = CITY_COUNTRY[parsed.citySlug] || CITY_COUNTRY[parsed.citySlug.split("-")[0]] || "";
      if (!country.toLowerCase().includes(countryFilter.toLowerCase())) continue;
    }
    candidates.push(parsed);
  }

  // Bulk-build rows and upsert in batches of 50
  const rows = candidates.map((p) => {
    const country = CITY_COUNTRY[p.citySlug] || CITY_COUNTRY[p.citySlug.split("-")[0]] || null;
    const stdType = TYPE_MAP[p.typeSlug.replace(/-/g, "_")] || TYPE_MAP[p.typeSlug] || "motorboat";
    const typeLabel = titleCase(p.typeSlug);
    const name = `${typeLabel} ${p.city}`.trim();

    return {
      company_id: companyId,
      name,
      slug: slugify(`samboat-${p.typeSlug}-${p.citySlug}`),
      boat_type: stdType,
      base_port: p.city,
      country,
      region: country,
      currency: "EUR",
      features: [],
      images: [],
      description: `${typeLabel} zur Charter in ${p.city} via Samboat.`,
      charter_type: "bareboat",
      status: "active",
      detail_url: buildAffiliateUrl(p.url),
      source: "samboat_sitemap",
    } as Record<string, unknown>;
  });

  let inserted = 0;
  let errorMsg: string | null = null;
  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error, count } = await db
      .from("charter_boats")
      .upsert(batch, { onConflict: "slug", ignoreDuplicates: false, count: "exact" });
    if (error) {
      errorMsg = error.message;
      // Fallback: try one-by-one to skip individual bad rows
      for (const row of batch) {
        const { error: e } = await db
          .from("charter_boats")
          .upsert(row, { onConflict: "slug", ignoreDuplicates: false });
        if (!e) inserted++;
      }
    } else {
      inserted += count ?? batch.length;
    }
  }
  void errorMsg;

  // Log the run
  await db.from("scrape_log").insert({
    targets: [`samboat:${lang}`],
    scraped: candidates.length,
    inserted,
    results: { totalUrls: allUrls.length, skip, limit, countryFilter },
  }).select().single().then(() => {}, () => {});

  return NextResponse.json({
    ok: true,
    platform: "samboat",
    lang,
    sitemapTotalUrls: allUrls.length,
    skip,
    limit,
    matched: candidates.length,
    inserted,
    nextSkip: skip + candidates.length,
    sample: rows.slice(0, 5).map((r) => ({
      name: r.name,
      type: r.boat_type,
      country: r.country,
      port: r.base_port,
    })),
  });
}
