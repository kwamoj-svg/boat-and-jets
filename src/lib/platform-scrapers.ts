import type { ExtractedListing } from "./claude-ai";

interface ScraperResult {
  listings: ExtractedListing[];
  platform: string;
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
};

async function fetchWithTimeout(url: string, ms = 5000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: HEADERS });
    clearTimeout(timeout);
    if (!res.ok) return "";
    return await res.text();
  } catch {
    clearTimeout(timeout);
    return "";
  }
}

function extractJsonLd(html: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) results.push(...parsed);
      else results.push(parsed);
    } catch { /* skip */ }
  }
  return results;
}

/** Extract individual boat detail page links from HTML */
function extractDetailLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]+href=["']([^"'#]+)['"]/gi;
  let m;
  while ((m = re.exec(html)) !== null && links.length < 30) {
    let href = m[1];
    if (href.startsWith("/")) href = baseUrl + href;
    if (!href.startsWith("http") || seen.has(href)) continue;
    // Skip non-boat pages
    if (/login|register|cookie|privacy|terms|faq|blog|about|contact|\.pdf|\.css/i.test(href)) continue;
    const path = href.replace(baseUrl, "");
    const segments = path.split("/").filter(Boolean);
    // Detail pages typically have 2+ path segments with a specific slug
    const isDetail =
      (segments.length >= 2 && /[a-z]+-\d+|[a-z]+-[a-z]+-[a-z]+/i.test(path)) ||
      /\/boat\/|\/boot\/|\/yacht\/|\/listing\/|\/offer\/|\/detail\//i.test(path) ||
      /checkIn|checkout|booking|reserve/i.test(href);
    if (isDetail) {
      seen.add(href);
      links.push(href);
    }
  }
  return links;
}

export async function scrapeClickAndBoat(location: string, boatType?: string): Promise<ScraperResult> {
  const loc = encodeURIComponent(location.toLowerCase().replace(/\s+/g, "-"));
  const type = boatType ? `&boat_type=${encodeURIComponent(boatType)}` : "";
  const url = `https://www.click-boat.com/en/boat-rental/${loc}?${type}`;

  const html = await fetchWithTimeout(url);
  if (!html) return { listings: [], platform: "click-boat.com" };

  const listings: ExtractedListing[] = [];
  const jsonLd = extractJsonLd(html);

  for (const item of jsonLd) {
    if (item["@type"] === "Product" || item["@type"] === "Offer") {
      const name = String(item.name || "");
      if (!name) continue;
      const offers = (item.offers || item) as Record<string, unknown>;
      listings.push({
        name,
        type: boatType || "motor",
        description: String(item.description || "").slice(0, 200),
        source_url: String(item.url || url),
        source_title: `Click&Boat - ${name}`,
        currency: String((offers as Record<string, unknown>).priceCurrency || "EUR"),
        price_per_day: Number((offers as Record<string, unknown>).price) || undefined,
        region: location,
        country: location,
        features: [],
        luxury_level: 3,
        match_score: 0.75,
        match_reasons: ["Direct platform listing", "Click&Boat"],
        ai_summary: String(item.description || "").slice(0, 150),
        image_url: String(item.image || (item.images as string[])?.[0] || ""),
      } as ExtractedListing);
    }
  }

  if (listings.length === 0) {
    const cardRe = /data-testid="boat-card"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<(?:h2|h3|span)[^>]*>([^<]+)/gi;
    let m;
    while ((m = cardRe.exec(html)) !== null && listings.length < 10) {
      const href = m[1].startsWith("http") ? m[1] : `https://www.click-boat.com${m[1]}`;
      listings.push({
        name: m[2].trim(),
        type: boatType || "motor",
        description: "",
        source_url: href,
        source_title: `Click&Boat - ${m[2].trim()}`,
        currency: "EUR",
        region: location,
        country: location,
        features: [],
        luxury_level: 3,
        match_score: 0.7,
        match_reasons: ["Click&Boat listing"],
        ai_summary: `Boat available for charter in ${location} via Click&Boat.`,
      } as ExtractedListing);
    }
  }

  return { listings: listings.slice(0, 8), platform: "click-boat.com" };
}

export async function scrapeSamboat(location: string, boatType?: string): Promise<ScraperResult> {
  const loc = encodeURIComponent(location);
  const url = `https://www.samboat.com/en/boat-rental/${loc.toLowerCase().replace(/%20/g, "-")}`;
  const baseUrl = "https://www.samboat.com";

  const html = await fetchWithTimeout(url);
  if (!html) return { listings: [], platform: "samboat.com" };

  const listings: ExtractedListing[] = [];
  const jsonLd = extractJsonLd(html);
  const detailLinks = extractDetailLinks(html, baseUrl);

  for (const item of jsonLd) {
    if (item["@type"] === "Product" || item["@type"] === "BoatRental") {
      const name = String(item.name || "");
      if (!name) continue;
      let detailUrl = String(item.url || "");
      if (!detailUrl || detailUrl === url || /\/boat-rental\//i.test(detailUrl)) {
        const nameParts = name.toLowerCase().split(/[\s/]+/).filter(w => w.length > 2);
        const match = detailLinks.find(link => nameParts.some(p => link.toLowerCase().includes(p)));
        if (match) detailUrl = match;
      }
      listings.push({
        name,
        type: boatType || "motor",
        description: String(item.description || "").slice(0, 200),
        source_url: detailUrl || url,
        source_title: `Samboat - ${name}`,
        currency: "EUR",
        region: location,
        country: location,
        features: [],
        luxury_level: 3,
        match_score: detailUrl && detailUrl !== url ? 0.8 : 0.65,
        match_reasons: ["Direct platform listing", "Samboat"],
        ai_summary: String(item.description || "").slice(0, 150),
        image_url: String(item.image || ""),
      } as ExtractedListing);
    }
  }

  // Fallback: create listings from detail links
  if (listings.length === 0 && detailLinks.length > 0) {
    for (const link of detailLinks.slice(0, 10)) {
      const slug = link.split("/").pop()?.split("?")[0] || "";
      const name = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      if (name.length < 3) continue;
      listings.push({
        name,
        type: boatType || "motor",
        description: `Boat available for charter in ${location} via Samboat.`,
        source_url: link,
        source_title: `Samboat - ${name}`,
        currency: "EUR",
        region: location,
        country: location,
        features: [],
        luxury_level: 3,
        match_score: 0.7,
        match_reasons: ["Direct platform listing", "Samboat"],
        ai_summary: `${name} available in ${location}.`,
      } as ExtractedListing);
    }
  }

  return { listings: listings.slice(0, 10), platform: "samboat.com" };
}

export async function scrapeNautal(location: string, boatType?: string): Promise<ScraperResult> {
  const loc = encodeURIComponent(location.toLowerCase().replace(/\s+/g, "-"));
  const url = `https://www.nautal.com/boat-rental/${loc}`;
  const baseUrl = "https://www.nautal.com";

  const html = await fetchWithTimeout(url);
  if (!html) return { listings: [], platform: "nautal.com" };

  const listings: ExtractedListing[] = [];
  const jsonLd = extractJsonLd(html);
  const detailLinks = extractDetailLinks(html, baseUrl);

  for (const item of jsonLd) {
    const name = String(item.name || "");
    if (!name || name.length < 3) continue;
    let detailUrl = String(item.url || "");
    if (!detailUrl || detailUrl === url || /\/boat-rental\//i.test(detailUrl)) {
      const nameParts = name.toLowerCase().split(/[\s/]+/).filter(w => w.length > 2);
      const match = detailLinks.find(link => nameParts.some(p => link.toLowerCase().includes(p)));
      if (match) detailUrl = match;
    }
    listings.push({
      name,
      type: boatType || "motor",
      description: String(item.description || "").slice(0, 200),
      source_url: detailUrl || url,
      source_title: `Nautal - ${name}`,
      currency: "EUR",
      region: location,
      country: location,
      features: [],
      luxury_level: 3,
      match_score: detailUrl && detailUrl !== url ? 0.8 : 0.65,
      match_reasons: ["Direct platform listing", "Nautal"],
      ai_summary: String(item.description || "").slice(0, 150),
      image_url: String(item.image || ""),
    } as ExtractedListing);
  }

  if (listings.length === 0 && detailLinks.length > 0) {
    for (const link of detailLinks.slice(0, 10)) {
      const slug = link.split("/").pop()?.split("?")[0] || "";
      const name = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      if (name.length < 3) continue;
      listings.push({
        name, type: boatType || "motor",
        description: `Boat available in ${location} via Nautal.`,
        source_url: link, source_title: `Nautal - ${name}`,
        currency: "EUR", region: location, country: location, features: [],
        luxury_level: 3, match_score: 0.7, match_reasons: ["Direct platform listing", "Nautal"],
        ai_summary: `${name} available in ${location}.`,
      } as ExtractedListing);
    }
  }

  return { listings: listings.slice(0, 10), platform: "nautal.com" };
}

export async function scrapeGetMyBoat(location: string, boatType?: string): Promise<ScraperResult> {
  const loc = encodeURIComponent(location);
  const type = boatType ? `&boat_type=${encodeURIComponent(boatType)}` : "";
  const url = `https://www.getmyboat.com/search?location=${loc}${type}`;
  const baseUrl = "https://www.getmyboat.com";

  const html = await fetchWithTimeout(url);
  if (!html) return { listings: [], platform: "getmyboat.com" };

  const listings: ExtractedListing[] = [];
  const jsonLd = extractJsonLd(html);
  const detailLinks = extractDetailLinks(html, baseUrl);

  for (const item of jsonLd) {
    const name = String(item.name || "");
    if (!name || name.length < 3) continue;
    let detailUrl = String(item.url || "");
    if (!detailUrl || detailUrl === url || /\/search/i.test(detailUrl)) {
      const nameParts = name.toLowerCase().split(/[\s/]+/).filter(w => w.length > 2);
      const match = detailLinks.find(link => nameParts.some(p => link.toLowerCase().includes(p)));
      if (match) detailUrl = match;
    }
    listings.push({
      name,
      type: boatType || "motor",
      description: String(item.description || "").slice(0, 200),
      source_url: detailUrl || url,
      source_title: `GetMyBoat - ${name}`,
      currency: "USD",
      region: location,
      country: location,
      features: [],
      luxury_level: 3,
      match_score: detailUrl && detailUrl !== url ? 0.8 : 0.65,
      match_reasons: ["Direct platform listing", "GetMyBoat"],
      ai_summary: String(item.description || "").slice(0, 150),
      image_url: String(item.image || ""),
    } as ExtractedListing);
  }

  if (listings.length === 0 && detailLinks.length > 0) {
    for (const link of detailLinks.slice(0, 10)) {
      const slug = link.split("/").pop()?.split("?")[0] || "";
      const name = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      if (name.length < 3) continue;
      listings.push({
        name, type: boatType || "motor",
        description: `Boat available in ${location} via GetMyBoat.`,
        source_url: link, source_title: `GetMyBoat - ${name}`,
        currency: "USD", region: location, country: location, features: [],
        luxury_level: 3, match_score: 0.7, match_reasons: ["Direct platform listing", "GetMyBoat"],
        ai_summary: `${name} available in ${location}.`,
      } as ExtractedListing);
    }
  }

  return { listings: listings.slice(0, 10), platform: "getmyboat.com" };
}

export async function scrapeBoataround(location: string, boatType?: string): Promise<ScraperResult> {
  const loc = encodeURIComponent(location.toLowerCase().replace(/\s+/g, "-"));
  const url = `https://www.boataround.com/en/yacht-charter/${loc}`;
  const baseUrl = "https://www.boataround.com";

  const html = await fetchWithTimeout(url);
  if (!html) return { listings: [], platform: "boataround.com" };

  const listings: ExtractedListing[] = [];
  const jsonLd = extractJsonLd(html);
  const detailLinks = extractDetailLinks(html, baseUrl);

  for (const item of jsonLd) {
    const name = String(item.name || "");
    if (!name || name.length < 3) continue;
    // Try to find a detail link matching this boat name
    const nameParts = name.toLowerCase().split(/[\s/]+/).filter(w => w.length > 2);
    let detailUrl = String(item.url || "");
    if (!detailUrl || detailUrl === url || /\/yacht-charter\/|\/search/i.test(detailUrl)) {
      const match = detailLinks.find(link => nameParts.some(p => link.toLowerCase().includes(p)));
      if (match) detailUrl = match;
    }
    listings.push({
      name,
      type: boatType || "sailing",
      description: String(item.description || "").slice(0, 200),
      source_url: detailUrl || url,
      source_title: `Boataround - ${name}`,
      currency: "EUR",
      region: location,
      country: location,
      features: [],
      luxury_level: 3,
      match_score: detailUrl && detailUrl !== url ? 0.8 : 0.65,
      match_reasons: ["Direct platform listing", "Boataround"],
      ai_summary: String(item.description || "").slice(0, 150),
      image_url: String(item.image || ""),
    } as ExtractedListing);
  }

  // If JSON-LD gave nothing, create listings from detail links directly
  if (listings.length === 0 && detailLinks.length > 0) {
    for (const link of detailLinks.slice(0, 10)) {
      // Extract name from URL slug: /boot/concordia-102-ac-joanne → Concordia 102 Ac Joanne
      const slug = link.split("/").pop()?.split("?")[0] || "";
      const name = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      if (name.length < 3) continue;
      listings.push({
        name,
        type: boatType || "sailing",
        description: `Boat available for charter in ${location} via Boataround.`,
        source_url: link,
        source_title: `Boataround - ${name}`,
        currency: "EUR",
        region: location,
        country: location,
        features: [],
        luxury_level: 3,
        match_score: 0.7,
        match_reasons: ["Direct platform listing", "Boataround"],
        ai_summary: `${name} available for charter in ${location}.`,
      } as ExtractedListing);
    }
  }

  return { listings: listings.slice(0, 10), platform: "boataround.com" };
}

export async function scrapeZizoo(location: string, boatType?: string): Promise<ScraperResult> {
  const loc = encodeURIComponent(location.toLowerCase().replace(/\s+/g, "-"));
  const url = `https://www.zizoo.com/en/search/${loc}`;
  const baseUrl = "https://www.zizoo.com";

  const html = await fetchWithTimeout(url);
  if (!html) return { listings: [], platform: "zizoo.com" };

  const listings: ExtractedListing[] = [];
  const jsonLd = extractJsonLd(html);
  const detailLinks = extractDetailLinks(html, baseUrl);

  for (const item of jsonLd) {
    const name = String(item.name || "");
    if (!name || name.length < 3) continue;
    let detailUrl = String(item.url || "");
    if (!detailUrl || detailUrl === url || /\/search\//i.test(detailUrl)) {
      const nameParts = name.toLowerCase().split(/[\s/]+/).filter(w => w.length > 2);
      const match = detailLinks.find(link => nameParts.some(p => link.toLowerCase().includes(p)));
      if (match) detailUrl = match;
    }
    listings.push({
      name,
      type: boatType || "sailing",
      description: String(item.description || "").slice(0, 200),
      source_url: detailUrl || url,
      source_title: `Zizoo - ${name}`,
      currency: "EUR",
      region: location,
      country: location,
      features: [],
      luxury_level: 3,
      match_score: detailUrl && detailUrl !== url ? 0.8 : 0.65,
      match_reasons: ["Direct platform listing", "Zizoo"],
      ai_summary: String(item.description || "").slice(0, 150),
      image_url: String(item.image || ""),
    } as ExtractedListing);
  }

  if (listings.length === 0 && detailLinks.length > 0) {
    for (const link of detailLinks.slice(0, 10)) {
      const slug = link.split("/").pop()?.split("?")[0] || "";
      const name = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      if (name.length < 3) continue;
      listings.push({
        name, type: boatType || "sailing",
        description: `Boat available in ${location} via Zizoo.`,
        source_url: link, source_title: `Zizoo - ${name}`,
        currency: "EUR", region: location, country: location, features: [],
        luxury_level: 3, match_score: 0.7, match_reasons: ["Direct platform listing", "Zizoo"],
        ai_summary: `${name} available in ${location}.`,
      } as ExtractedListing);
    }
  }

  return { listings: listings.slice(0, 10), platform: "zizoo.com" };
}

export async function scrapeAllPlatforms(
  location: string,
  boatType?: string
): Promise<ExtractedListing[]> {
  if (!location) return [];

  const results = await Promise.allSettled([
    scrapeClickAndBoat(location, boatType),
    scrapeSamboat(location, boatType),
    scrapeNautal(location, boatType),
    scrapeGetMyBoat(location, boatType),
    scrapeBoataround(location, boatType),
    scrapeZizoo(location, boatType),
  ]);

  const allListings: ExtractedListing[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.listings.length > 0) {
      allListings.push(...result.value.listings);
    }
  }

  return allListings;
}
