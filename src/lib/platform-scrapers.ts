import type { ExtractedListing } from "./claude-ai";

interface ScraperResult {
  listings: ExtractedListing[];
  platform: string;
}

// Rotate User-Agents to avoid bot detection on Render servers
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:128.0) Gecko/20100101 Firefox/128.0",
];

function getHeaders(): Record<string, string> {
  return {
    "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  };
}

async function fetchWithTimeout(url: string, ms = 8000, extraHeaders?: Record<string, string>): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { ...getHeaders(), ...extraHeaders },
      redirect: "follow",
    });
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
  while ((m = re.exec(html)) !== null && links.length < 60) {
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

  return { listings: listings.slice(0, 15), platform: "click-boat.com" };
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

  return { listings: listings.slice(0, 20), platform: "samboat.com" };
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

  return { listings: listings.slice(0, 20), platform: "nautal.com" };
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

  return { listings: listings.slice(0, 20), platform: "getmyboat.com" };
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

  return { listings: listings.slice(0, 20), platform: "boataround.com" };
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

  return { listings: listings.slice(0, 20), platform: "zizoo.com" };
}

/* ── Master-Yachting.de — HTMX scraper (fast, structured data) ── */

const MY_LOCATION_MAP: Record<string, string> = {
  // Country → slug
  croatia: "kroatien", kroatien: "kroatien", kroatia: "kroatien",
  greece: "griechenland", griechenland: "griechenland",
  italy: "italien", italien: "italien",
  spain: "spanien", spanien: "spanien",
  turkey: "tuerkei", tuerkei: "tuerkei", türkei: "tuerkei",
  france: "frankreich", frankreich: "frankreich",
  germany: "deutschland", deutschland: "deutschland",
  montenegro: "montenegro",
  netherlands: "niederlande", niederlande: "niederlande",
  malta: "malta",
  // Cities/islands → specific paths
  ibiza: "spanien/ibiza", mallorca: "spanien/mallorca",
  sardinia: "italien/sardinien", sardinien: "italien/sardinien",
  tuscany: "italien/toskana", toskana: "italien/toskana",
  athens: "griechenland/in-athen", athen: "griechenland/in-athen",
  dalmatia: "kroatien/dalmatien", dalmatien: "kroatien/dalmatien",
  split: "kroatien", dubrovnik: "kroatien",
  trogir: "kroatien", zadar: "kroatien",
};

const MY_COUNTRY_MAP: Record<string, string> = {
  kroatien: "Croatia", griechenland: "Greece", italien: "Italy",
  spanien: "Spain", tuerkei: "Turkey", frankreich: "France",
  deutschland: "Germany", montenegro: "Montenegro",
  niederlande: "Netherlands", malta: "Malta",
};

function myTypeToStandard(cat: string): string {
  const l = cat.toLowerCase();
  if (l.includes("katamaran") || l.includes("catamaran")) return "catamaran";
  if (l.includes("motor")) return "motor";
  if (l.includes("segel") || l.includes("sail")) return "sailing";
  return "sailing";
}

/** Parse a single Master-Yachting HTML page into boat data */
function parseMYPage(html: string): {
  boatData: { name: string; price: number; loc: string; cat: string; id: number }[];
  urls: string[];
  images: string[];
} {
  const boatData: { name: string; price: number; loc: string; cat: string; id: number }[] = [];
  const urls: string[] = [];
  const images: string[] = [];

  const dispatchRe = /x-init="\$dispatch\('view-item-list-add',\s*\{([^}]+)\}\)/g;
  const urlRe = /href="(\/de\/boat\/[^"]+)"/g;
  const decoded = html.replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
  const imgRe = /photos:\s*\['(https:\/\/[^']+)'/g;

  let m;
  while ((m = dispatchRe.exec(html)) !== null) {
    const fields: Record<string, string> = {};
    const fieldRe = /'(\w+)':\s*(?:'([^']*)'|([\d.]+))/g;
    let fm;
    while ((fm = fieldRe.exec(m[1])) !== null) {
      fields[fm[1]] = fm[2] || fm[3] || "";
    }
    if (fields.item_name) {
      boatData.push({
        name: fields.item_name,
        price: Number(fields.price) || 0,
        loc: fields.item_brand || "",
        cat: fields.item_category || "",
        id: Number(fields.item_id) || 0,
      });
    }
  }
  while ((m = urlRe.exec(html)) !== null) {
    if (!urls.includes(m[1])) urls.push(m[1]);
  }
  while ((m = imgRe.exec(decoded)) !== null) {
    images.push(m[1]);
  }

  return { boatData, urls, images };
}

export async function scrapeMasterYachting(location: string, boatType?: string): Promise<ScraperResult> {
  const locLower = location.toLowerCase().replace(/\s+/g, "-");
  const slug = MY_LOCATION_MAP[locLower]
    || Object.entries(MY_LOCATION_MAP).find(([k]) => locLower.includes(k))?.[1]
    || null;

  if (!slug) return { listings: [], platform: "master-yachting.de" };

  // Fetch 3 pages in parallel for more results (~20 boats per page = ~60 total)
  const pageUrls = [1, 2, 3].map(p => `https://www.master-yachting.de/de/boat-rental/${slug}/?page=${p}`);
  const pageResults = await Promise.allSettled(
    pageUrls.map(url => fetchWithTimeout(url, 12000, { "HX-Request": "true" }))
  );

  const allBoatData: { name: string; price: number; loc: string; cat: string; id: number }[] = [];
  const allUrls: string[] = [];
  const allImages: string[] = [];
  const seenIds = new Set<number>();

  for (const result of pageResults) {
    if (result.status !== "fulfilled" || !result.value) continue;
    const { boatData, urls, images } = parseMYPage(result.value);
    for (const bd of boatData) {
      if (seenIds.has(bd.id)) continue;
      seenIds.add(bd.id);
      const idx = allBoatData.length;
      allBoatData.push(bd);
      // Align URLs and images by index offset
      if (urls[boatData.indexOf(bd)]) allUrls[idx] = urls[boatData.indexOf(bd)];
      if (images[boatData.indexOf(bd)]) allImages[idx] = images[boatData.indexOf(bd)];
    }
    // Also add remaining URLs/images that weren't matched
    for (let i = 0; i < urls.length; i++) {
      if (!allUrls.includes(urls[i])) allUrls.push(urls[i]);
    }
    for (let i = 0; i < images.length; i++) {
      if (!allImages.includes(images[i])) allImages.push(images[i]);
    }
  }

  const listings: ExtractedListing[] = [];
  const countrySlug = slug.split("/")[0];
  const country = MY_COUNTRY_MAP[countrySlug] || "";
  const baseUrl = pageUrls[0];

  for (let i = 0; i < allBoatData.length; i++) {
    const bd = allBoatData[i];
    const type = myTypeToStandard(bd.cat);
    if (boatType && type !== boatType && !bd.cat.toLowerCase().includes(boatType)) continue;

    const port = bd.loc.replace(/-\d+$/, "").replace(/-/g, " ")
      .replace(/\baci\b/gi, "ACI").replace(/\bmarina\b/gi, "Marina")
      .replace(/\b\w/g, c => c.toUpperCase());

    const nameParts = bd.name.split(" ");
    const boatUrl = allUrls[i] ? `https://www.master-yachting.de${allUrls[i]}` : baseUrl;

    listings.push({
      name: bd.name,
      type,
      brand: nameParts[0] || undefined,
      model: nameParts.slice(1).join(" ") || undefined,
      year: undefined,
      length_ft: undefined,
      cabins: undefined,
      guests: undefined,
      crew: undefined,
      price_per_week: bd.price > 0 ? bd.price : undefined,
      price_per_day: bd.price > 0 ? Math.round(bd.price / 7) : undefined,
      sale_price: undefined,
      currency: "EUR",
      region: country,
      country,
      port,
      features: [],
      description: `${bd.name} — ${bd.cat} for charter in ${port}, ${country}.`,
      source_url: boatUrl,
      source_title: `Master Yachting — ${bd.name}`,
      luxury_level: 3,
      match_score: boatUrl !== baseUrl ? 0.85 : 0.65,
      match_reasons: ["Direct platform listing", "Master Yachting", "Detail URL"],
      ai_summary: `${bd.name} in ${port}${bd.price ? `, from €${bd.price}/week` : ""}.`,
      image_url: allImages[i] || undefined,
    } as ExtractedListing);
  }

  return { listings: listings.slice(0, 60), platform: "master-yachting.de" };
}

/* ── Click&Boat — sitemap-based location search ── */

/** Location alias map for Click&Boat city slugs */
const CB_LOCATION_ALIASES: Record<string, string[]> = {
  ibiza: ["ibiza", "eivissa"],
  mallorca: ["mallorca", "palma-de-mallorca", "palma"],
  sardinia: ["sardinien", "sardinia", "olbia", "cagliari"],
  croatia: ["kroatien", "croatia", "split", "dubrovnik", "zadar", "trogir", "pula"],
  greece: ["griechenland", "greece", "athen", "athens", "lefkada", "korfu", "corfu", "mykonos", "santorini", "kos", "rhodos"],
  italy: ["italien", "italy", "neapel", "naples", "amalfi", "sizilien", "sicily", "genua", "genoa"],
  france: ["frankreich", "france", "nizza", "nice", "marseille", "cannes", "korsika", "corsica", "ajaccio"],
  turkey: ["tuerkei", "turkey", "bodrum", "fethiye", "marmaris", "gocek", "goecek"],
  spain: ["spanien", "spain", "barcelona", "valencia", "malaga", "alicante"],
};

function cbLocationMatches(city: string, locLower: string): boolean {
  if (city.includes(locLower) || locLower.includes(city)) return true;
  // Check aliases
  for (const [, aliases] of Object.entries(CB_LOCATION_ALIASES)) {
    const matchesSearch = aliases.some(a => locLower.includes(a) || a.includes(locLower));
    const matchesCity = aliases.some(a => city.includes(a) || a.includes(city));
    if (matchesSearch && matchesCity) return true;
  }
  return false;
}

async function scrapeClickAndBoatSitemap(location: string, boatType?: string): Promise<ScraperResult> {
  const locLower = location.toLowerCase().replace(/\s+/g, "-");

  // Fetch BOTH German product sitemaps in parallel (50,000+ entries total)
  const [xml0, xml1] = await Promise.allSettled([
    fetchWithTimeout("https://www.clickandboat.com/sitemaps/1707/CAB/products-de_0.xml", 20000),
    fetchWithTimeout("https://www.clickandboat.com/sitemaps/1707/CAB/products-de_1.xml", 20000),
  ]);

  const xmlTexts: string[] = [];
  if (xml0.status === "fulfilled" && xml0.value) xmlTexts.push(xml0.value);
  if (xml1.status === "fulfilled" && xml1.value) xmlTexts.push(xml1.value);
  if (xmlTexts.length === 0) return { listings: [], platform: "clickandboat.com" };

  const listings: ExtractedListing[] = [];

  for (const xml of xmlTexts) {
    if (listings.length >= 50) break;
    const blocks = xml.split("</url>");

    for (const block of blocks) {
      if (listings.length >= 50) break;
      const locMatch = block.match(/<loc><!\[CDATA\[(https:\/\/www\.clickandboat\.com\/de\/boot-mieten\/([^/]+)\/([^/]+)\/([^\]]+))\]\]><\/loc>/);
      if (!locMatch) continue;

      const [, fullUrl, city, typeSlug, nameSlug] = locMatch;
      if (!cbLocationMatches(city, locLower)) continue;

      if (boatType) {
        const stdType = typeSlug.includes("segel") ? "sailing" : typeSlug.includes("katamaran") ? "catamaran" : "motor";
        if (stdType !== boatType && !typeSlug.includes(boatType)) continue;
      }

      const imgMatch = block.match(/<image:loc>(https:\/\/[^<]+)<\/image:loc>/);
      const imageUrl = imgMatch ? imgMatch[1] : undefined;

      // Remove trailing hash IDs (e.g. "-x6g83", "-vj6bwp5", "-b995yjk")
      const cleanSlug = decodeURIComponent(nameSlug).replace(/-[a-z0-9]{4,8}$/, "");
      const name = cleanSlug.split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
      const cityName = decodeURIComponent(city).replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      const type = typeSlug.includes("segel") ? "sailing" : typeSlug.includes("katamaran") ? "catamaran" : typeSlug.includes("schlauchboot") ? "speedboat" : "motor";
      const parts = cleanSlug.split("-");
      const brand = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : undefined;

      listings.push({
        name,
        type,
        brand,
        model: undefined,
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
        port: cityName,
        features: [],
        description: `${name} for charter in ${cityName} via Click&Boat.`,
        source_url: fullUrl,
        source_title: `Click&Boat — ${name}`,
        luxury_level: 3,
        match_score: 0.8,
        match_reasons: ["Direct platform listing", "Click&Boat", "Detail URL"],
        ai_summary: `${name} — ${type} charter in ${cityName}.`,
        image_url: imageUrl,
      } as ExtractedListing);
    }
  }

  // Enrich first 15 with prices from detail pages (parallel, fast)
  const enrichBatch = listings.slice(0, 15);
  await Promise.allSettled(
    enrichBatch.map(async (b) => {
      try {
        const html = await fetchWithTimeout(b.source_url, 4000);
        if (!html) return;
        // Try og:title for better name
        const ogTitle = html.match(/og:title['"]\s*content=['"](.*?)['"]/);
        if (ogTitle) {
          let title = ogTitle[1]
            .replace(/\s*[-|–]\s*Click.*$/i, "")
            .replace(/Boot mieten\s*/i, "")
            .replace(/Bootsverleih\s*/i, "")
            .replace(/&#0?39;/g, "'").replace(/&amp;/g, "&").trim();
          if (title.length > 3) b.name = title;
        }
        // Try og:image
        const ogImg = html.match(/og:image['"]\s*content=['"](https?:\/\/[^'"]+)['"]/);
        if (ogImg && !b.image_url) b.image_url = ogImg[1];
        // Try to find price (€XXX pattern)
        const priceMatch = html.match(/(?:price|preis|ab|from)\s*[:\s]*(\d[\d.,]*)\s*€/i)
          || html.match(/(\d[\d.,]*)\s*€\s*\/\s*(?:Tag|jour|day)/i)
          || html.match(/"price"\s*:\s*"?(\d[\d.,]*)"?/);
        if (priceMatch) {
          const price = Number(priceMatch[1].replace(/\./g, "").replace(",", "."));
          if (price > 0 && price < 50000) {
            b.price_per_day = price;
            b.price_per_week = price * 7;
          }
        }
      } catch { /* ignore */ }
    })
  );

  return { listings, platform: "clickandboat.com" };
}

/* ── Samboat — sitemap-based location search ── */

const SB_LOCATION_ALIASES: Record<string, string[]> = {
  ibiza: ["ibiza", "eivissa"],
  mallorca: ["mallorca", "palma"],
  croatia: ["kroatien", "croatia", "split", "dubrovnik", "zadar", "trogir", "pula"],
  greece: ["griechenland", "greece", "athen", "athens", "lefkada", "korfu", "corfu", "mykonos", "kos"],
  italy: ["italien", "italy", "neapel", "naples", "sizilien", "sicily", "sardinien", "sardinia", "olbia"],
  france: ["frankreich", "france", "nizza", "nice", "marseille", "cannes", "korsika", "corsica"],
  turkey: ["tuerkei", "turkey", "bodrum", "fethiye", "marmaris"],
  spain: ["spanien", "spain", "barcelona", "valencia", "malaga"],
};

function sbLocationMatches(city: string, locLower: string): boolean {
  if (city.includes(locLower) || locLower.includes(city)) return true;
  for (const [, aliases] of Object.entries(SB_LOCATION_ALIASES)) {
    const matchesSearch = aliases.some(a => locLower.includes(a) || a.includes(locLower));
    const matchesCity = aliases.some(a => city.includes(a) || a.includes(city));
    if (matchesSearch && matchesCity) return true;
  }
  return false;
}

function sbTypeToStandard(t: string): string {
  if (t.includes("segel")) return "sailing";
  if (t.includes("motor")) return "motor";
  if (t.includes("katamaran")) return "catamaran";
  if (t.includes("schlauchboot") || t.includes("rib")) return "speedboat";
  if (t.includes("gulet")) return "gulet";
  if (t.includes("hausboot")) return "motor";
  return "motor";
}

async function scrapeSamboatSitemap(location: string, boatType?: string): Promise<ScraperResult> {
  const locLower = location.toLowerCase().replace(/\s+/g, "-");
  const xml = await fetchWithTimeout("https://www.samboat.de/sitemap_de_product_listings.xml", 20000);
  if (!xml) return { listings: [], platform: "samboat.de" };

  const listings: ExtractedListing[] = [];
  const locPattern = /<loc>(https:\/\/www\.samboat\.de\/boot-mieten\/[^<]+)<\/loc>/g;
  let m;

  while ((m = locPattern.exec(xml)) !== null && listings.length < 40) {
    const url = m[1];
    const parts = url.replace("https://www.samboat.de/boot-mieten/", "").split("/");
    if (parts.length < 3) continue;

    const [city, typeSlug, id] = parts;
    if (!sbLocationMatches(city, locLower)) continue;

    const stdType = sbTypeToStandard(typeSlug);
    if (boatType && stdType !== boatType && !typeSlug.includes(boatType)) continue;

    const cityName = decodeURIComponent(city).replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const typeName = decodeURIComponent(typeSlug).replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    listings.push({
      name: `${typeName} ${cityName} #${id}`,
      type: stdType,
      brand: undefined,
      model: undefined,
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
      port: cityName,
      features: [],
      description: `${typeName} for charter in ${cityName} via Samboat.`,
      source_url: url,
      source_title: `Samboat — ${typeName} in ${cityName}`,
      luxury_level: 3,
      match_score: 0.78,
      match_reasons: ["Direct listing", "Samboat", "Verified detail URL"],
      ai_summary: `${typeName} charter in ${cityName} via Samboat.`,
      image_url: undefined,
    } as ExtractedListing);
  }

  // Enrich first 15 with names + images from detail pages (parallel, fast)
  const enrichBatch = listings.slice(0, 15);
  const enrichResults = await Promise.allSettled(
    enrichBatch.map(async (b) => {
      const html = await fetchWithTimeout(b.source_url, 3500);
      if (!html) return;
      const ogTitle = html.match(/og:title['"]\s*content=['"](.*?)['"]/);
      if (ogTitle) {
        let title = ogTitle[1]
          .replace(/\s*[-|]\s*Samboat.*$/i, "")
          .replace(/Boot mieten\s*/i, "")
          .replace(/^Mieten Sie ein(?:e|en)?\s+(?:Segelboot|Motorboot|Katamaran|Yacht|Hausboot|Schlauchboot|Boot)\s*/i, "")
          .replace(/&#0?39;/g, "'").replace(/&amp;/g, "&").trim();
        if (title.length > 3) b.name = title;
      }
      const ogImg = html.match(/og:image['"]\s*content=['"](https?:\/\/[^'"]+)['"]/);
      if (ogImg) b.image_url = ogImg[1];
    })
  );

  return { listings, platform: "samboat.de" };
}

export async function scrapeAllPlatforms(
  location: string,
  boatType?: string
): Promise<ExtractedListing[]> {
  if (!location) return [];

  const results = await Promise.allSettled([
    scrapeMasterYachting(location, boatType),   // up to 60
    scrapeClickAndBoatSitemap(location, boatType), // up to 50
    scrapeSamboatSitemap(location, boatType),   // up to 40
    scrapeClickAndBoat(location, boatType),     // up to 15
    scrapeSamboat(location, boatType),          // up to 20
    scrapeNautal(location, boatType),           // up to 20
    scrapeGetMyBoat(location, boatType),        // up to 20
    scrapeBoataround(location, boatType),       // up to 20
    scrapeZizoo(location, boatType),            // up to 20
  ]);

  const allListings: ExtractedListing[] = [];
  const seenNames = new Set<string>();
  const scraperNames = [
    "master-yachting", "clickandboat-sitemap", "samboat-sitemap",
    "clickandboat", "samboat", "nautal", "getmyboat", "boataround", "zizoo",
  ];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const name = scraperNames[i] || `scraper-${i}`;
    if (result.status === "fulfilled") {
      const count = result.value.listings.length;
      if (count > 0) {
        console.log(`[SCRAPER] ${name}: ${count} boats`);
        for (const listing of result.value.listings) {
          const key = (listing.name || "").toLowerCase().trim();
          if (key.length < 3 || seenNames.has(key)) continue;
          seenNames.add(key);
          allListings.push(listing);
        }
      } else {
        console.log(`[SCRAPER] ${name}: 0 boats`);
      }
    } else {
      console.error(`[SCRAPER] ${name} FAILED:`, result.reason?.message || result.reason);
    }
  }

  console.log(`[SCRAPER] Total: ${allListings.length} unique boats from ${location}`);
  return allListings;
}
