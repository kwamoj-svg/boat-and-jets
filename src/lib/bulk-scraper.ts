/**
 * Bulk scraper for Master-Yachting.de and Boataround.com
 * Fetches real boat data with names, prices, specs, images, and detail URLs.
 * Designed to populate the database with high-quality listings.
 */

import type { ExtractedListing } from "./claude-ai";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
};

async function fetchWithTimeout(
  url: string,
  ms = 6000,
  extraHeaders?: Record<string, string>
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { ...HEADERS, ...extraHeaders },
    });
    clearTimeout(timeout);
    if (!res.ok) return "";
    return await res.text();
  } catch {
    clearTimeout(timeout);
    return "";
  }
}

/* ═══════════════════════════════════════════
   MASTER-YACHTING.DE SCRAPER
   Uses HTMX endpoints — structured Alpine.js data
   ═══════════════════════════════════════════ */

const MY_BASE = "https://www.master-yachting.de";

// Destination slugs → country mapping
const MY_DESTINATIONS: Record<string, { country: string; region: string }> = {
  kroatien: { country: "Croatia", region: "Mediterranean" },
  griechenland: { country: "Greece", region: "Mediterranean" },
  italien: { country: "Italy", region: "Mediterranean" },
  spanien: { country: "Spain", region: "Mediterranean" },
  tuerkei: { country: "Turkey", region: "Mediterranean" },
  frankreich: { country: "France", region: "Mediterranean" },
  montenegro: { country: "Montenegro", region: "Mediterranean" },
  slowenien: { country: "Slovenia", region: "Mediterranean" },
  malta: { country: "Malta", region: "Mediterranean" },
  niederlande: { country: "Netherlands", region: "Northern Europe" },
  deutschland: { country: "Germany", region: "Northern Europe" },
  // Sub-destinations
  "kroatien/dalmatien": { country: "Croatia", region: "Dalmatia" },
  "griechenland/in-athen": { country: "Greece", region: "Athens" },
  "griechenland/ionian-greece": { country: "Greece", region: "Ionian" },
  "italien/sardinien": { country: "Italy", region: "Sardinia" },
  "italien/toskana": { country: "Italy", region: "Tuscany" },
  "spanien/mallorca": { country: "Spain", region: "Mallorca" },
  "spanien/ibiza": { country: "Spain", region: "Ibiza" },
  // Caribbean
  "britische-jungferninseln": { country: "British Virgin Islands", region: "Caribbean" },
  martinique: { country: "Martinique", region: "Caribbean" },
  guadeloupe: { country: "Guadeloupe", region: "Caribbean" },
  bahamas: { country: "Bahamas", region: "Caribbean" },
  // Indian Ocean
  seychellen: { country: "Seychelles", region: "Indian Ocean" },
  mauritius: { country: "Mauritius", region: "Indian Ocean" },
  malediven: { country: "Maldives", region: "Indian Ocean" },
  // Asia-Pacific
  thailand: { country: "Thailand", region: "Southeast Asia" },
};

interface MYBoatCard {
  item_id: number;
  item_name: string;
  price: number;
  location: string; // item_brand in their GTM = marina/city slug
  category: string; // Segelboot, Katamaran, Motorboot
  url: string;
  image_url: string;
}

function parseMYListingPage(html: string): MYBoatCard[] {
  const boats: MYBoatCard[] = [];

  // Extract from Alpine.js x-init dispatch events
  const dispatchPattern =
    /x-init="\$dispatch\('view-item-list-add',\s*\{([^}]+)\}\)/g;
  let match;
  while ((match = dispatchPattern.exec(html)) !== null) {
    const block = match[1];
    const fields: Record<string, string> = {};
    const fieldPattern = /'(\w+)':\s*(?:'([^']*)'|([\d.]+))/g;
    let fm;
    while ((fm = fieldPattern.exec(block)) !== null) {
      fields[fm[1]] = fm[2] || fm[3] || "";
    }
    if (fields.item_name) {
      boats.push({
        item_id: Number(fields.item_id) || 0,
        item_name: fields.item_name,
        price: Number(fields.price) || 0,
        location: fields.item_brand || "",
        category: fields.item_category || "",
        url: "",
        image_url: "",
      });
    }
  }

  // Extract detail URLs
  const urlPattern = /href="(\/de\/boat\/[^"]+)"/g;
  const urls: string[] = [];
  while ((match = urlPattern.exec(html)) !== null) {
    if (!urls.includes(match[1])) urls.push(match[1]);
  }

  // Extract first image per card — HTML uses &#x27; for single quotes
  const decoded = html.replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
  const imgPattern = /photos:\s*\['(https:\/\/[^']+)'/g;
  const images: string[] = [];
  while ((match = imgPattern.exec(decoded)) !== null) {
    images.push(match[1]);
  }

  // Match URLs and images to boats
  for (let i = 0; i < boats.length; i++) {
    if (i < urls.length) boats[i].url = MY_BASE + urls[i];
    if (i < images.length) boats[i].image_url = images[i];
  }

  return boats;
}

function myTypeToStandard(cat: string): string {
  const lower = cat.toLowerCase();
  if (lower.includes("katamaran") || lower.includes("catamaran")) return "catamaran";
  if (lower.includes("motor")) return "motor";
  if (lower.includes("segel") || lower.includes("sail")) return "sailing";
  if (lower.includes("gulet")) return "gulet";
  return "sailing";
}

/** Fetch boat specs from a Master-Yachting detail page */
async function fetchMYBoatSpecs(
  url: string
): Promise<{ year?: number; length_ft?: number; cabins?: number; guests?: number }> {
  try {
    const html = await fetchWithTimeout(url, 4000);
    if (!html) return {};

    // Decode HTML entities
    const decoded = html.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

    const specs: Record<string, string> = {};

    // Extract text-based specs near known labels
    const specPattern =
      /(Baujahr|Gesamtlänge|Kojen|Doppelte Kabinen|Kabinen|WC)\s*<\/\w+>\s*<\w+[^>]*>\s*(\d+[\d.,]*)\s*(Fuß|ft|m)?/gi;
    let m;
    while ((m = specPattern.exec(decoded)) !== null) {
      specs[m[1].toLowerCase()] = m[2] + (m[3] ? " " + m[3] : "");
    }

    // Fallback: strip tags approach
    if (Object.keys(specs).length === 0) {
      const stripped = decoded.replace(/<[^>]+>/g, "|");
      const pairs = stripped.match(
        /(Baujahr|Gesamtlänge|Kojen|Kabinen)\|\s*(\d+[\d.,]*)\s*(Fuß|ft|m)?/gi
      );
      if (pairs) {
        for (const p of pairs) {
          const parts = p.split("|").map((s) => s.trim());
          if (parts.length >= 2) specs[parts[0].toLowerCase()] = parts[1];
        }
      }
    }

    const year = specs.baujahr ? Number(specs.baujahr) : undefined;
    const lengthRaw = specs["gesamtlänge"] || "";
    let length_ft: number | undefined;
    if (lengthRaw.includes("Fuß") || lengthRaw.includes("ft")) {
      length_ft = Number(lengthRaw.replace(/[^\d]/g, "")) || undefined;
    } else if (lengthRaw) {
      // Meters to feet
      const m = Number(lengthRaw.replace(/[^\d.,]/g, "").replace(",", "."));
      if (m > 0) length_ft = Math.round(m * 3.281);
    }
    const cabins = specs["doppelte kabinen"]
      ? Number(specs["doppelte kabinen"])
      : specs.kabinen
        ? Number(specs.kabinen)
        : undefined;
    const guests = specs.kojen ? Number(specs.kojen) : undefined;

    return { year, length_ft, cabins, guests };
  } catch {
    return {};
  }
}

/** Scrape Master-Yachting for a specific destination, up to maxPages */
export async function scrapeMasterYachting(
  destination: string,
  maxPages = 5,
  fetchSpecs = false
): Promise<ExtractedListing[]> {
  const destInfo = MY_DESTINATIONS[destination] || {
    country: destination,
    region: "",
  };
  const allBoats: ExtractedListing[] = [];
  const seenIds = new Set<number>();

  for (let page = 1; page <= maxPages; page++) {
    const url = `${MY_BASE}/de/boat-rental/${destination}/?page=${page}`;
    // Master-Yachting uses HTMX — needs HX-Request header to return boat cards
    const html = await fetchWithTimeout(url, 8000, { "HX-Request": "true" });
    if (!html) break;

    const cards = parseMYListingPage(html);
    if (cards.length === 0) break;

    for (const card of cards) {
      if (seenIds.has(card.item_id)) continue;
      seenIds.add(card.item_id);

      // Optionally fetch detail specs (slower but more data)
      let specs: { year?: number; length_ft?: number; cabins?: number; guests?: number } = {};
      if (fetchSpecs && card.url && allBoats.length < 30) {
        specs = await fetchMYBoatSpecs(card.url);
      }

      // Extract brand/model from name
      const nameParts = card.item_name.split(" ");
      const brand = nameParts[0] || undefined;
      const model = nameParts.slice(1).join(" ") || undefined;

      // Derive port from location slug
      const port = card.location
        .replace(/-\d+$/, "")
        .replace(/-/g, " ")
        .replace(/\baci\b/gi, "ACI")
        .replace(/\bmarina\b/gi, "Marina")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      allBoats.push({
        name: card.item_name,
        type: myTypeToStandard(card.category),
        brand,
        model,
        year: specs.year,
        length_ft: specs.length_ft,
        cabins: specs.cabins,
        guests: specs.guests,
        crew: undefined,
        price_per_week: card.price > 0 ? card.price : undefined,
        price_per_day: card.price > 0 ? Math.round(card.price / 7) : undefined,
        sale_price: undefined,
        currency: "EUR",
        region: destInfo.region,
        country: destInfo.country,
        port,
        features: [],
        description: `${card.item_name} — ${card.category} available for charter in ${port}, ${destInfo.country}. Weekly from €${card.price}.`,
        source_url: card.url || `${MY_BASE}/de/boat-rental/${destination}/`,
        source_title: `Master Yachting — ${card.item_name}`,
        luxury_level: 3,
        match_score: card.url ? 0.85 : 0.65,
        match_reasons: ["Direct listing", "Master Yachting", "Verified detail URL"],
        ai_summary: `${card.item_name} in ${port}, ${destInfo.country}. ${card.category}${card.price ? ` from €${card.price}/week` : ""}.`,
        image_url: card.image_url || undefined,
      });
    }

    // Small delay between pages
    if (page < maxPages) await new Promise((r) => setTimeout(r, 300));
  }

  return allBoats;
}

/* ═══════════════════════════════════════════
   BOATAROUND.COM SCRAPER
   Uses XML sitemaps — thousands of boats with images
   Detail pages have JSON-LD + meta tags for specs
   ═══════════════════════════════════════════ */

const BA_BASE = "https://www.boataround.com";

// Sitemap files by boat type
const BA_SITEMAPS: { type: string; files: string[] }[] = [
  {
    type: "sailing",
    files: Array.from({ length: 10 }, (_, i) =>
      `sitemap_de_sailing_yacht_${i + 1}.xml`
    ),
  },
  {
    type: "motor",
    files: Array.from({ length: 9 }, (_, i) =>
      `sitemap_de_motor_yacht_motor_boat_gulet_${i + 1}.xml`
    ),
  },
  {
    type: "catamaran",
    files: Array.from({ length: 8 }, (_, i) =>
      `sitemap_de_catamaran_power_catamaran_houseboat_${i + 1}.xml`
    ),
  },
];

interface BASitemapEntry {
  url: string;
  imageUrl: string;
  slug: string;
}

function parseBASitemap(xml: string): BASitemapEntry[] {
  const entries: BASitemapEntry[] = [];
  // Split on </url> boundaries (XML is on one line)
  const urlBlocks = xml.split("</url>");
  for (const block of urlBlocks) {
    const locMatch = block.match(/<loc>(https:\/\/www\.boataround\.com\/de\/boot\/[^<]+)<\/loc>/);
    if (!locMatch) continue;
    const url = locMatch[1];
    const slug = url.split("/boot/")[1] || "";

    const imgMatch = block.match(/<image:loc>([^<]+)<\/image:loc>/);
    const imageUrl = imgMatch
      ? imgMatch[1].replace(/&amp;/g, "&")
      : "";

    entries.push({ url, imageUrl, slug });
  }
  return entries;
}

function slugToBoatName(slug: string): { name: string; brand?: string; model?: string } {
  // Slug pattern: "bavaria-cruiser-40-perun" → "Bavaria Cruiser 40 Perun"
  // Remove trailing unique names (boat names after the model number)
  const parts = slug.split("-");
  const name = parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

  // Try to detect brand (first word) and model (rest before unique name)
  const brand = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : undefined;

  // Find where the model number is (first numeric part)
  let modelEnd = parts.length;
  for (let i = 1; i < parts.length; i++) {
    if (/^\d+$/.test(parts[i])) {
      modelEnd = i + 1;
      break;
    }
  }
  const model = parts
    .slice(1, modelEnd)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ") || undefined;

  return { name, brand, model };
}

/** Fetch a single Boataround detail page for country/region info */
async function fetchBADetailMeta(
  url: string
): Promise<{ country?: string; region?: string }> {
  try {
    const html = await fetchWithTimeout(url, 4000);
    if (!html) return {};

    // Extract from JSON-LD breadcrumb
    const breadcrumb = html.match(/"BreadcrumbList"[\s\S]*?"itemListElement":\[([\s\S]*?)\]/);
    if (breadcrumb) {
      const items = breadcrumb[1].match(/"name":"([^"]+)"/g) || [];
      const names = items.map((m) => m.replace(/"name":"/, "").replace(/"/, ""));
      // Pattern: Startseite → Country → Region → City
      const country = names[1] || undefined;
      const region = names[2] || undefined;
      return { country, region };
    }

    // Fallback: meta description
    const desc = html.match(/meta[^>]+name="description"[^>]+content="([^"]+)"/);
    if (desc) {
      // "Segelboot Bavaria Cruiser 40 Perun zur Miete. Kroatien - Region Zadar."
      const countryMatch = desc[1].match(/\.\s*([A-ZÄÖÜ][a-zäöü]+(?:\s+[A-ZÄÖÜ][a-zäöü]+)*)\s*[-–]/);
      if (countryMatch) return { country: countryMatch[1] };
    }

    return {};
  } catch {
    return {};
  }
}

/** Scrape Boataround via sitemaps — fast, gets thousands of boats */
export async function scrapeBoataround(
  boatType: string = "sailing",
  maxSitemaps = 2,
  maxPerSitemap = 200
): Promise<ExtractedListing[]> {
  const typeConfig = BA_SITEMAPS.find((s) => s.type === boatType) || BA_SITEMAPS[0];
  const allBoats: ExtractedListing[] = [];
  const seenSlugs = new Set<string>();

  for (let i = 0; i < Math.min(typeConfig.files.length, maxSitemaps); i++) {
    const sitemapUrl = `${BA_BASE}/sitemap/${typeConfig.files[i]}`;
    const xml = await fetchWithTimeout(sitemapUrl, 10000);
    if (!xml) continue;

    const entries = parseBASitemap(xml);
    let count = 0;

    for (const entry of entries) {
      if (count >= maxPerSitemap) break;
      if (seenSlugs.has(entry.slug)) continue;
      seenSlugs.add(entry.slug);

      const { name, brand, model } = slugToBoatName(entry.slug);
      if (name.length < 3) continue;

      allBoats.push({
        name,
        type: boatType,
        brand,
        model,
        year: undefined,
        length_ft: undefined,
        cabins: undefined,
        guests: undefined,
        crew: undefined,
        price_per_week: undefined,
        price_per_day: undefined,
        sale_price: undefined,
        currency: "EUR",
        region: "",
        country: "",
        port: undefined,
        features: [],
        description: `${name} available for charter via Boataround.`,
        source_url: entry.url,
        source_title: `Boataround — ${name}`,
        luxury_level: 3,
        match_score: 0.8,
        match_reasons: ["Direct listing", "Boataround", "Verified detail URL"],
        ai_summary: `${name} — ${boatType} charter via Boataround.`,
        image_url: entry.imageUrl || undefined,
      });
      count++;
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  // Fetch country/region for a sample of boats (first 20) to enrich data
  const sample = allBoats.slice(0, 20);
  const metaResults = await Promise.allSettled(
    sample.map((b) => fetchBADetailMeta(b.source_url))
  );
  for (let i = 0; i < sample.length; i++) {
    const result = metaResults[i];
    if (result.status === "fulfilled") {
      const meta = result.value;
      if (meta.country) {
        sample[i].country = meta.country;
        sample[i].region = meta.region || "";
      }
    }
  }

  // Apply most common country to unresolved boats
  const countryCounts = new Map<string, number>();
  for (const b of allBoats) {
    if (b.country) countryCounts.set(b.country, (countryCounts.get(b.country) || 0) + 1);
  }
  const topCountry = [...countryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return allBoats;
}

/* ═══════════════════════════════════════════
   BULK SCRAPE — run all destinations
   ═══════════════════════════════════════════ */

export interface ScrapeProgress {
  platform: string;
  destination: string;
  boatsFound: number;
  totalSoFar: number;
  done: boolean;
}

export type ProgressCallback = (p: ScrapeProgress) => void;

/** Scrape all destinations from Master-Yachting */
export async function bulkScrapeMasterYachting(
  destinations?: string[],
  pagesPerDest = 3,
  onProgress?: ProgressCallback
): Promise<ExtractedListing[]> {
  const dests = destinations || Object.keys(MY_DESTINATIONS);
  const all: ExtractedListing[] = [];

  for (const dest of dests) {
    try {
      const boats = await scrapeMasterYachting(dest, pagesPerDest, false);
      all.push(...boats);
      onProgress?.({
        platform: "master-yachting.de",
        destination: dest,
        boatsFound: boats.length,
        totalSoFar: all.length,
        done: false,
      });
    } catch (e) {
      console.error(`[Scraper] Master-Yachting ${dest} failed:`, e);
    }
    // Rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  onProgress?.({
    platform: "master-yachting.de",
    destination: "all",
    boatsFound: 0,
    totalSoFar: all.length,
    done: true,
  });

  return all;
}

/** Scrape all boat types from Boataround sitemaps */
export async function bulkScrapeBoataround(
  boatTypes?: string[],
  sitemapsPerType = 2,
  onProgress?: ProgressCallback
): Promise<ExtractedListing[]> {
  const types = boatTypes || ["sailing", "motor", "catamaran"];
  const all: ExtractedListing[] = [];

  for (const type of types) {
    try {
      const boats = await scrapeBoataround(type, sitemapsPerType, 200);
      all.push(...boats);
      onProgress?.({
        platform: "boataround.com",
        destination: type,
        boatsFound: boats.length,
        totalSoFar: all.length,
        done: false,
      });
    } catch (e) {
      console.error(`[Scraper] Boataround ${type} failed:`, e);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  onProgress?.({
    platform: "boataround.com",
    destination: "all",
    boatsFound: 0,
    totalSoFar: all.length,
    done: true,
  });

  return all;
}

/** Available destinations/types for each platform */
export const MASTER_YACHTING_DESTINATIONS = Object.keys(MY_DESTINATIONS);
export const BOATAROUND_BOAT_TYPES = ["sailing", "motor", "catamaran"];
