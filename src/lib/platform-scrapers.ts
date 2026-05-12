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

export async function scrapeMasterYachting(location: string, boatType?: string): Promise<ScraperResult> {
  // Resolve location to Master-Yachting path
  const locLower = location.toLowerCase().replace(/\s+/g, "-");
  const slug = MY_LOCATION_MAP[locLower]
    || Object.entries(MY_LOCATION_MAP).find(([k]) => locLower.includes(k))?.[1]
    || null;

  if (!slug) return { listings: [], platform: "master-yachting.de" };

  const url = `https://www.master-yachting.de/de/boat-rental/${slug}/?page=1`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  let html = "";
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { ...HEADERS, "HX-Request": "true" },
    });
    clearTimeout(timeout);
    if (!res.ok) return { listings: [], platform: "master-yachting.de" };
    html = await res.text();
  } catch {
    clearTimeout(timeout);
    return { listings: [], platform: "master-yachting.de" };
  }

  const listings: ExtractedListing[] = [];

  // Parse Alpine.js x-init structured data
  const dispatchRe = /x-init="\$dispatch\('view-item-list-add',\s*\{([^}]+)\}\)/g;
  const urlRe = /href="(\/de\/boat\/[^"]+)"/g;

  // Decode HTML entities for images
  const decoded = html.replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
  const imgRe = /photos:\s*\['(https:\/\/[^']+)'/g;

  const boatData: { name: string; price: number; loc: string; cat: string; id: number }[] = [];
  const urls: string[] = [];
  const images: string[] = [];

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

  const countrySlug = slug.split("/")[0];
  const country = MY_COUNTRY_MAP[countrySlug] || "";

  for (let i = 0; i < boatData.length; i++) {
    const bd = boatData[i];
    const type = myTypeToStandard(bd.cat);
    if (boatType && type !== boatType && !bd.cat.toLowerCase().includes(boatType)) continue;

    const port = bd.loc.replace(/-\d+$/, "").replace(/-/g, " ")
      .replace(/\baci\b/gi, "ACI").replace(/\bmarina\b/gi, "Marina")
      .replace(/\b\w/g, c => c.toUpperCase());

    const nameParts = bd.name.split(" ");
    const boatUrl = i < urls.length ? `https://www.master-yachting.de${urls[i]}` : url;

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
      match_score: boatUrl !== url ? 0.85 : 0.65,
      match_reasons: ["Direct platform listing", "Master Yachting", "Detail URL"],
      ai_summary: `${bd.name} in ${port}${bd.price ? `, from €${bd.price}/week` : ""}.`,
      image_url: i < images.length ? images[i] : undefined,
    } as ExtractedListing);
  }

  return { listings: listings.slice(0, 15), platform: "master-yachting.de" };
}

/* ── Click&Boat — sitemap-based location search ── */

async function scrapeClickAndBoatSitemap(location: string, boatType?: string): Promise<ScraperResult> {
  const locLower = location.toLowerCase().replace(/\s+/g, "-");
  // Fetch the German products sitemap (up to 25,000 entries)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let xml = "";
  try {
    const res = await fetch(
      "https://www.clickandboat.com/sitemaps/1707/CAB/products-de_0.xml",
      { signal: controller.signal, headers: HEADERS }
    );
    clearTimeout(timeout);
    if (res.ok) xml = await res.text();
  } catch {
    clearTimeout(timeout);
  }

  if (!xml) return { listings: [], platform: "clickandboat.com" };

  // Parse and filter by location
  const listings: ExtractedListing[] = [];
  const blocks = xml.split("</url>");

  for (const block of blocks) {
    if (listings.length >= 15) break;
    const locMatch = block.match(/<loc><!\[CDATA\[(https:\/\/www\.clickandboat\.com\/de\/boot-mieten\/([^/]+)\/([^/]+)\/([^\]]+))\]\]><\/loc>/);
    if (!locMatch) continue;

    const [, fullUrl, city, typeSlug, nameSlug] = locMatch;
    // Filter by location
    if (!city.includes(locLower) && !locLower.includes(city)) continue;

    // Filter by boat type if specified
    if (boatType) {
      const stdType = typeSlug.includes("segel") ? "sailing" : typeSlug.includes("katamaran") ? "catamaran" : "motor";
      if (stdType !== boatType && !typeSlug.includes(boatType)) continue;
    }

    // Extract images
    const imgMatch = block.match(/<image:loc>(https:\/\/[^<]+)<\/image:loc>/);
    const imageUrl = imgMatch ? imgMatch[1] : undefined;

    // Parse name from slug
    const cleanSlug = nameSlug.replace(/-[a-z0-9]{4,6}$/, "");
    const name = cleanSlug.split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
    const cityName = city.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
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

  return { listings, platform: "clickandboat.com" };
}

export async function scrapeAllPlatforms(
  location: string,
  boatType?: string
): Promise<ExtractedListing[]> {
  if (!location) return [];

  const results = await Promise.allSettled([
    scrapeMasterYachting(location, boatType),
    scrapeClickAndBoatSitemap(location, boatType),
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
