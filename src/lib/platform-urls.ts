/**
 * Platform-specific URL constructors.
 * Instead of linking to broken category pages, we construct smart search URLs
 * with the user's filters (location, dates, guests) pre-filled.
 * The user lands on the platform's search results page → can immediately book.
 */

interface SearchParams {
  location?: string;
  country?: string;
  city?: string;
  guests?: number;
  dateFrom?: string; // ISO date
  dateTo?: string;
  boatType?: string;
}

interface PlatformUrlBuilder {
  domain: string;
  buildUrl: (params: SearchParams) => string;
}

const loc = (p: SearchParams) =>
  (p.city || p.location || p.country || "").toLowerCase().replace(/\s+/g, "-");

const PLATFORM_BUILDERS: PlatformUrlBuilder[] = [
  {
    domain: "boataround.com",
    buildUrl: (p) => {
      const base = `https://www.boataround.com/en/yacht-charter/${loc(p)}`;
      const params = new URLSearchParams();
      if (p.guests) params.set("persons", String(p.guests));
      if (p.dateFrom) params.set("checkIn", p.dateFrom);
      if (p.dateTo) params.set("checkOut", p.dateTo);
      return params.toString() ? `${base}?${params}` : base;
    },
  },
  {
    domain: "click-boat.com",
    buildUrl: (p) => {
      const base = `https://www.click-boat.com/en/boat-rental/${loc(p)}`;
      const params = new URLSearchParams();
      if (p.guests) params.set("nb_persons", String(p.guests));
      if (p.dateFrom) params.set("start_date", p.dateFrom);
      if (p.dateTo) params.set("end_date", p.dateTo);
      if (p.boatType) params.set("boat_type", p.boatType);
      return params.toString() ? `${base}?${params}` : base;
    },
  },
  {
    domain: "samboat.com",
    buildUrl: (p) => {
      const base = `https://www.samboat.com/en/boat-rental/${loc(p)}`;
      const params = new URLSearchParams();
      if (p.guests) params.set("capacityMin", String(p.guests));
      if (p.dateFrom) params.set("startDate", p.dateFrom);
      if (p.dateTo) params.set("endDate", p.dateTo);
      return params.toString() ? `${base}?${params}` : base;
    },
  },
  {
    domain: "getmyboat.com",
    buildUrl: (p) => {
      const params = new URLSearchParams();
      params.set("location", p.city || p.location || p.country || "");
      if (p.guests) params.set("passengers", String(p.guests));
      if (p.dateFrom) params.set("date", p.dateFrom);
      return `https://www.getmyboat.com/search?${params}`;
    },
  },
  {
    domain: "nautal.com",
    buildUrl: (p) => {
      const base = `https://www.nautal.com/boat-rental/${loc(p)}`;
      const params = new URLSearchParams();
      if (p.dateFrom) params.set("start_date", p.dateFrom);
      if (p.dateTo) params.set("end_date", p.dateTo);
      return params.toString() ? `${base}?${params}` : base;
    },
  },
  {
    domain: "zizoo.com",
    buildUrl: (p) => {
      const base = `https://www.zizoo.com/en/search/${loc(p)}`;
      const params = new URLSearchParams();
      if (p.dateFrom) params.set("startDate", p.dateFrom);
      if (p.dateTo) params.set("endDate", p.dateTo);
      if (p.guests) params.set("capacity", String(p.guests));
      return params.toString() ? `${base}?${params}` : base;
    },
  },
  {
    domain: "sailo.com",
    buildUrl: (p) => {
      const params = new URLSearchParams();
      if (p.city || p.location) params.set("location", p.city || p.location || "");
      if (p.guests) params.set("guests", String(p.guests));
      return `https://www.sailo.com/search?${params}`;
    },
  },
  {
    domain: "yachtcharterfleet.com",
    buildUrl: (p) => {
      const area = loc(p) || "mediterranean";
      return `https://www.yachtcharterfleet.com/luxury-charter-yacht-search/yachts_${area}.htm`;
    },
  },
  {
    domain: "12knots.com",
    buildUrl: (p) => {
      const base = `https://www.12knots.com/yacht-charter/${loc(p)}`;
      return base;
    },
  },
  {
    domain: "charterworld.com",
    buildUrl: (p) => {
      return `https://www.charterworld.com/index.html?sub=yacht-charter&charter_location=${encodeURIComponent(p.city || p.country || "")}`;
    },
  },
  {
    domain: "boatbookings.com",
    buildUrl: (p) => {
      const params = new URLSearchParams();
      if (p.country || p.city) params.set("destination", p.city || p.country || "");
      if (p.guests) params.set("guests", String(p.guests));
      return `https://www.boatbookings.com/yacht-search?${params}`;
    },
  },
  {
    domain: "moorings.com",
    buildUrl: (p) => {
      return `https://www.moorings.com/destinations/${loc(p)}`;
    },
  },
  {
    domain: "dreamyachtcharter.com",
    buildUrl: (p) => {
      return `https://www.dreamyachtcharter.com/destinations/${loc(p)}/`;
    },
  },
];

// Lookup map for fast domain matching
const builderMap = new Map(PLATFORM_BUILDERS.map((b) => [b.domain, b.buildUrl]));

/**
 * Check if a URL is a category/search/homepage (not a specific boat page).
 */
export function isCategoryUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    const segments = path.split("/").filter(Boolean);

    // Homepage or single-segment path
    if (segments.length <= 1) return true;

    // Known category patterns
    if (/\/(search|results|fleet|boats?-list|yacht-charter|boat-rental|browse|destinations?)\/?$/i.test(path)) return true;

    // Category with just location (e.g. /boat-rental/croatia)
    if (segments.length === 2 && /^(boat-rental|yacht-charter|charter|search|boats|en|de|fr)$/i.test(segments[0])) return true;
    if (segments.length === 3 && /^(en|de|fr|es|it)$/i.test(segments[0]) && /^(boat-rental|yacht-charter|charter|search)$/i.test(segments[1])) return true;

    // Last segment is just a location name (no numbers, no long slug)
    const lastSeg = segments[segments.length - 1];
    if (segments.length <= 3 && !/\d/.test(lastSeg) && lastSeg.split("-").length <= 2) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Upgrade a listing URL: if it's a category page, construct a smart platform search URL.
 * If URL is already a detail page, leave it as-is.
 */
export function upgradeUrl(
  sourceUrl: string,
  params: SearchParams
): string {
  if (!isCategoryUrl(sourceUrl)) return sourceUrl; // Already a detail page

  try {
    const domain = new URL(sourceUrl).hostname.replace("www.", "");
    const builder = builderMap.get(domain);
    if (builder) {
      return builder(params);
    }
  } catch {}

  return sourceUrl; // Unknown platform, can't improve
}

/**
 * Batch upgrade all listing URLs.
 */
export function upgradeAllUrls(
  listings: { source_url: string }[],
  params: SearchParams
): void {
  for (const listing of listings) {
    listing.source_url = upgradeUrl(listing.source_url, params);
  }
}
