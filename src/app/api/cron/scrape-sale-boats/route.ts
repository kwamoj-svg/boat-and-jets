import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 300;

/**
 * Hourly sale-boats scraper.
 * Hits major boat-sale marketplaces (YachtWorld, BoatTrader, Yachtall,
 * Apollo Duck, Boat24, Scanboat) via Serper search + page extraction.
 *
 * Trigger:  GET /api/cron/scrape-sale-boats
 *           Header: x-cron-secret: <secret>
 *           ?count=N  (default 6, max 15)
 */

const SALE_PLATFORMS = [
  { domain: "yachtworld.com", lang: "en" },
  { domain: "boattrader.com", lang: "en" },
  { domain: "yachtall.com", lang: "de" },
  { domain: "boat24.com", lang: "de" },
  { domain: "apolloduck.com", lang: "en" },
  { domain: "scanboat.com", lang: "en" },
  { domain: "boats.com", lang: "en" },
  { domain: "yachtfocus.com", lang: "nl" },
  { domain: "boatshop24.com", lang: "en" },
];

// Search categories to rotate through
const SCRAPE_QUERIES = [
  { type: "motorboat", q: "motor yacht for sale Mediterranean" },
  { type: "sailboat", q: "sailing yacht for sale Europe" },
  { type: "catamaran", q: "catamaran for sale" },
  { type: "motorboat", q: "Motoryacht zu verkaufen" },
  { type: "sailboat", q: "Segelyacht zu verkaufen Deutschland" },
  { type: "yacht", q: "superyacht for sale" },
  { type: "motorboat", q: "Sunseeker for sale" },
  { type: "motorboat", q: "Princess Yachts for sale" },
  { type: "motorboat", q: "Azimut for sale" },
  { type: "motorboat", q: "Ferretti for sale" },
  { type: "sailboat", q: "Beneteau Oceanis for sale" },
  { type: "sailboat", q: "Jeanneau Sun Odyssey for sale" },
  { type: "catamaran", q: "Lagoon catamaran for sale" },
  { type: "catamaran", q: "Bali catamaran for sale" },
  { type: "yacht", q: "Sanlorenzo for sale" },
];

function getServiceDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface SerperResult {
  link: string;
  title: string;
  snippet?: string;
}

async function serperSearch(q: string, limit = 10): Promise<SerperResult[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return [];
  try {
    const platformFilter = SALE_PLATFORMS
      .map((p) => `site:${p.domain}`)
      .join(" OR ");
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: `${q} (${platformFilter})`, num: limit }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.organic || []).filter((r: SerperResult) => {
      try {
        const host = new URL(r.link).hostname.replace("www.", "");
        return SALE_PLATFORMS.some((p) => host.includes(p.domain));
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Extract structured sale-boat data from a search result snippet */
function parseSerperResult(r: SerperResult, fallbackType: string): {
  name: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  length_m: number | null;
  sale_price: number | null;
  currency: string;
  location: string | null;
  country: string | null;
  description: string;
} | null {
  if (!r.title || !r.link) return null;

  let domain = "";
  try { domain = new URL(r.link).hostname.replace("www.", ""); } catch { return null; }
  if (!SALE_PLATFORMS.some((p) => domain.includes(p.domain))) return null;

  const text = `${r.title} ${r.snippet || ""}`;

  // Year (4 digits, 1980-2026)
  const yearMatch = text.match(/\b(19[8-9]\d|20[0-2]\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : null;

  // Price (€/$/£ followed by digits, or digits followed by EUR/USD/GBP)
  let sale_price: number | null = null;
  let currency = "EUR";
  const priceMatch = text.match(/(?:€|EUR|\$|USD|£|GBP)\s*([\d,.']+)|([\d,.']+)\s*(?:€|EUR|\$|USD|£|GBP)/i);
  if (priceMatch) {
    const raw = (priceMatch[1] || priceMatch[2] || "").replace(/[,.']/g, "");
    const num = parseInt(raw);
    if (!isNaN(num) && num >= 1000) {
      sale_price = num;
      if (/\$|USD/i.test(text)) currency = "USD";
      else if (/£|GBP/i.test(text)) currency = "GBP";
    }
  }

  // Length (e.g. "12m", "45ft", "12 Meter")
  let length_m: number | null = null;
  const lengthMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m\b|meter|metre)|(\d+(?:[.,]\d+)?)\s*(?:ft|feet|foot)/i);
  if (lengthMatch) {
    if (lengthMatch[1]) length_m = parseFloat(lengthMatch[1].replace(",", "."));
    else if (lengthMatch[2]) length_m = parseFloat(lengthMatch[2].replace(",", ".")) / 3.281;
  }

  // Brand detection (common brands)
  const brands = [
    "Sunseeker", "Princess", "Azimut", "Ferretti", "Beneteau", "Jeanneau",
    "Bavaria", "Lagoon", "Bali", "Sanlorenzo", "Pershing", "Riva", "Benetti",
    "Fairline", "Dufour", "Hanse", "Catalina", "Fountaine Pajot", "Leopard",
    "Moorings", "Sea Ray", "Boston Whaler", "Cranchi", "Astondoa", "Galeon",
    "Prestige", "Absolute", "Cantieri", "Custom Line", "Mochi Craft",
  ];
  let brand: string | null = null;
  for (const b of brands) {
    if (new RegExp(`\\b${b}\\b`, "i").test(text)) {
      brand = b;
      break;
    }
  }

  // Model — heuristic: word after brand
  let model: string | null = null;
  if (brand) {
    const m = text.match(new RegExp(`${brand}\\s+([\\w./-]+(?:\\s+[\\w./-]+){0,2})`, "i"));
    if (m) model = m[1].trim().replace(/[,.;]$/, "");
  }

  // Location — text after "in " or "at " or last word in title
  let location: string | null = null;
  let country: string | null = null;
  const locMatch = text.match(/\b(?:in|at|from)\s+([A-Z][a-zA-Z\s-]{2,30})/);
  if (locMatch) location = locMatch[1].trim();
  // Detect country from common patterns
  const COUNTRY_RX = [
    [/\b(Germany|Deutschland)\b/i, "Germany"],
    [/\b(Italy|Italien|Italia)\b/i, "Italy"],
    [/\b(Spain|Spanien|España)\b/i, "Spain"],
    [/\b(France|Frankreich)\b/i, "France"],
    [/\b(Croatia|Kroatien|Hrvatska)\b/i, "Croatia"],
    [/\b(Greece|Griechenland)\b/i, "Greece"],
    [/\b(Netherlands|Niederlande|Holland)\b/i, "Netherlands"],
    [/\b(Turkey|Türkei|Turkiye)\b/i, "Turkey"],
    [/\b(USA|United States|US)\b/, "USA"],
    [/\b(UK|United Kingdom|England)\b/, "UK"],
  ] as const;
  for (const [rx, c] of COUNTRY_RX) {
    if (rx.test(text)) { country = c; break; }
  }

  const name = r.title.replace(/\s*\|.*$/, "").replace(/^\d+\s*[-–]\s*/, "").slice(0, 120);

  return {
    name,
    brand,
    model,
    year,
    length_m,
    sale_price,
    currency,
    location,
    country,
    description: r.snippet || "",
  };
}

async function processQuery(
  db: SupabaseClient,
  spec: typeof SCRAPE_QUERIES[number]
): Promise<{ scraped: number; inserted: number }> {
  const results = await serperSearch(spec.q, 15);
  if (results.length === 0) return { scraped: 0, inserted: 0 };

  let inserted = 0;
  for (const r of results) {
    const parsed = parseSerperResult(r, spec.type);
    if (!parsed || !parsed.sale_price) continue; // require a price

    let domain = "";
    try { domain = new URL(r.link).hostname.replace("www.", ""); } catch { continue; }

    const slug = slugify(`${parsed.brand || ""}-${parsed.model || ""}-${parsed.year || ""}-${domain}`);

    const row = {
      name: parsed.name,
      slug,
      boat_type: spec.type,
      brand: parsed.brand,
      model: parsed.model,
      year: parsed.year,
      length_m: parsed.length_m,
      sale_price: parsed.sale_price,
      currency: parsed.currency,
      location: parsed.location,
      country: parsed.country,
      condition: parsed.year && parsed.year >= 2024 ? "new" : parsed.year && parsed.year >= 2018 ? "like_new" : "good",
      features: [],
      images: [],
      description: parsed.description.slice(0, 500),
      detail_url: r.link,
      source_domain: domain,
      source: "auto_scrape",
      status: "active",
      verified: false,
    };

    const { error } = await db
      .from("sale_boats")
      .upsert(row, { onConflict: "slug", ignoreDuplicates: false });
    if (!error) inserted++;
  }

  return { scraped: results.length, inserted };
}

/** After inserting new sale boats, check if any match user alerts */
async function matchAlerts(
  db: SupabaseClient,
  insertedSince: string
): Promise<number> {
  // Fetch active sale alerts
  const { data: alerts } = await db
    .from("notification_alerts")
    .select("id, user_id, criteria")
    .eq("is_active", true)
    .eq("kind", "sale");

  if (!alerts || alerts.length === 0) return 0;

  // Fetch new sale_boats since cutoff
  const { data: newBoats } = await db
    .from("sale_boats")
    .select("*")
    .gte("created_at", insertedSince)
    .eq("status", "active");

  if (!newBoats || newBoats.length === 0) return 0;

  let triggered = 0;
  for (const alert of alerts as { id: string; user_id: string; criteria: Record<string, unknown> }[]) {
    const c = alert.criteria || {};
    for (const boat of newBoats as Record<string, unknown>[]) {
      // Match criteria — all specified fields must match
      if (c.brand && !String(boat.brand || "").toLowerCase().includes(String(c.brand).toLowerCase())) continue;
      if (c.model && !String(boat.model || "").toLowerCase().includes(String(c.model).toLowerCase())) continue;
      if (c.boat_type && c.boat_type !== boat.boat_type) continue;
      if (c.country && String(boat.country || "").toLowerCase() !== String(c.country).toLowerCase()) continue;
      if (c.min_year && Number(boat.year || 0) < Number(c.min_year)) continue;
      if (c.max_year && Number(boat.year || 9999) > Number(c.max_year)) continue;
      if (c.max_budget && Number(boat.sale_price || 0) > Number(c.max_budget)) continue;
      if (c.min_length && Number(boat.length_m || 0) < Number(c.min_length)) continue;
      if (c.max_length && Number(boat.length_m || 99999) > Number(c.max_length)) continue;

      // alert_triggers table not created — fallback to analytics_events
      const { error } = await db.from("analytics_events").insert({
        user_id: alert.user_id,
        event_type: "alert_trigger",
        entity_type: "sale_boat",
        entity_id: String(boat.id),
        entity_name: String(boat.name || ""),
        country: boat.country ? String(boat.country) : null,
        properties: {
          alert_id: alert.id,
          match_kind: "sale",
          matched_table: "sale_boats",
          matched_id: boat.id,
          name: boat.name,
          brand: boat.brand,
          model: boat.model,
          year: boat.year,
          price: boat.sale_price,
          currency: boat.currency,
          country: boat.country,
          detail_url: boat.detail_url,
          image_url: Array.isArray(boat.images) ? (boat.images as string[])[0] : null,
        },
      });
      if (!error) triggered++;
    }
  }
  return triggered;
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET || "veliqa-scrape-2024";
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceDb();
  if (!db) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const count = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get("count") || "6")), 15);
  const startAtParam = req.nextUrl.searchParams.get("startAt");
  const hour = new Date().getUTCHours();
  const startIdx =
    startAtParam !== null
      ? Math.max(0, parseInt(startAtParam)) % SCRAPE_QUERIES.length
      : (hour * count) % SCRAPE_QUERIES.length;

  const queries = Array.from({ length: count }, (_, i) =>
    SCRAPE_QUERIES[(startIdx + i) % SCRAPE_QUERIES.length]
  );

  const cutoff = new Date().toISOString();

  const results = await Promise.allSettled(queries.map((q) => processQuery(db, q)));
  const totals = results.reduce(
    (acc, r) => {
      if (r.status === "fulfilled") {
        acc.scraped += r.value.scraped;
        acc.inserted += r.value.inserted;
      }
      return acc;
    },
    { scraped: 0, inserted: 0 }
  );

  // Match newly inserted boats against user alerts
  const triggered = await matchAlerts(db, cutoff);

  return NextResponse.json({
    ok: true,
    batchSize: count,
    queries: queries.map((q) => q.q),
    totalScraped: totals.scraped,
    totalInserted: totals.inserted,
    alertsTriggered: triggered,
  });
}
