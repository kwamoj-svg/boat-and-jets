import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 300;

/**
 * Broker Lead-Generation Agent.
 *
 * Searches Google (via Serper) for "looking to sell my yacht / boat for
 * sale" type posts on social media + classified sites, then extracts
 * structured leads into the broker_leads table.
 *
 * Trigger: GET /api/cron/find-broker-leads
 *          Header: x-cron-secret: <secret>
 *          ?count=N (default 10, max 30) — how many queries per run
 */

// Search targets that surface human "I want to sell" intent
const LEAD_QUERIES: { q: string; intent: "buy" | "sell" | "charter"; platform: string }[] = [
  // English — Instagram
  { q: 'site:instagram.com "for sale" yacht', intent: "sell", platform: "instagram" },
  { q: 'site:instagram.com "selling my" boat', intent: "sell", platform: "instagram" },
  { q: 'site:instagram.com "looking to sell" yacht', intent: "sell", platform: "instagram" },
  // LinkedIn
  { q: 'site:linkedin.com "yacht for sale" 2025', intent: "sell", platform: "linkedin" },
  { q: 'site:linkedin.com "boat broker" looking', intent: "sell", platform: "linkedin" },
  // Facebook Marketplace
  { q: 'site:facebook.com/marketplace yacht', intent: "sell", platform: "facebook" },
  { q: 'site:facebook.com/marketplace sailboat', intent: "sell", platform: "facebook" },
  { q: 'site:facebook.com/marketplace motoryacht', intent: "sell", platform: "facebook" },
  // Reddit
  { q: 'site:reddit.com/r/sailing "for sale"', intent: "sell", platform: "reddit" },
  { q: 'site:reddit.com/r/boating "selling"', intent: "sell", platform: "reddit" },
  { q: 'site:reddit.com/r/yachting "looking to sell"', intent: "sell", platform: "reddit" },
  // German classifieds
  { q: 'site:kleinanzeigen.de yacht zu verkaufen', intent: "sell", platform: "kleinanzeigen" },
  { q: 'site:ebay-kleinanzeigen.de motoryacht', intent: "sell", platform: "kleinanzeigen" },
  { q: 'site:quoka.de motorboot verkaufen', intent: "sell", platform: "kleinanzeigen" },
  // Specialized forums
  { q: 'site:boote-forum.de "verkaufe meine yacht"', intent: "sell", platform: "forum" },
  { q: 'site:cruisersforum.com "for sale by owner"', intent: "sell", platform: "forum" },
  // Buy intent (potential charter customer leads)
  { q: '"looking to charter" "yacht" 2026', intent: "charter", platform: "web" },
  { q: '"need a yacht charter" mediterranean', intent: "charter", platform: "web" },
  { q: '"want to buy" "sailboat" recommendations', intent: "buy", platform: "web" },
  // Twitter / X
  { q: 'site:twitter.com "yacht for sale" 2026', intent: "sell", platform: "twitter" },
  // YouTube (channels often link to listings)
  { q: 'site:youtube.com "yacht tour" "for sale"', intent: "sell", platform: "youtube" },
];

interface SerperResult {
  link: string;
  title: string;
  snippet?: string;
  date?: string;
}

function getServiceDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function serperSearch(q: string, limit = 10): Promise<SerperResult[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q, num: limit }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.organic || [];
  } catch {
    return [];
  }
}

const BRANDS = [
  "Sunseeker", "Princess", "Azimut", "Ferretti", "Beneteau", "Jeanneau",
  "Bavaria", "Lagoon", "Bali", "Sanlorenzo", "Pershing", "Riva", "Benetti",
  "Fairline", "Dufour", "Hanse", "Catalina", "Fountaine Pajot", "Leopard",
  "Sea Ray", "Boston Whaler", "Galeon", "Prestige", "Absolute", "Custom Line",
  "Hallberg-Rassy", "Oyster", "Najad", "X-Yachts", "Wally", "Riviera",
];

const COUNTRY_RX: Array<[RegExp, string]> = [
  [/\b(Germany|Deutschland)\b/i, "Germany"],
  [/\b(Italy|Italien|Italia)\b/i, "Italy"],
  [/\b(Spain|Spanien|España)\b/i, "Spain"],
  [/\b(France|Frankreich)\b/i, "France"],
  [/\b(Croatia|Kroatien)\b/i, "Croatia"],
  [/\b(Greece|Griechenland)\b/i, "Greece"],
  [/\b(Netherlands|Niederlande)\b/i, "Netherlands"],
  [/\b(Turkey|Türkei)\b/i, "Turkey"],
  [/\b(UK|United Kingdom|England)\b/, "UK"],
  [/\b(USA|United States)\b/, "USA"],
  [/\bDubai\b/i, "UAE"],
];

function parseLead(
  r: SerperResult,
  intent: "buy" | "sell" | "charter",
  platform: string
): {
  intent: typeof intent;
  source_platform: string;
  source_url: string;
  source_post_id: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  length_m: number | null;
  asking_price: number | null;
  currency: string;
  location: string | null;
  country: string | null;
  poster_handle: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  raw_text: string;
  language: string;
  quality_score: number;
  quality_reasons: string[];
} | null {
  if (!r.link || !r.title) return null;
  const text = `${r.title}\n${r.snippet || ""}`;
  const lower = text.toLowerCase();

  // Reject obvious spam / aggregator pages
  if (/(\bvergleich|\btop ?10|\bbeste|review|how to|tutorial)/i.test(text)) return null;

  // Boost score for strong-intent phrases
  let score = 0.4;
  const reasons: string[] = [];

  if (intent === "sell") {
    if (/looking to sell|selling my|for sale by owner|zu verkaufen|verkaufe (meine|mein)/i.test(text)) {
      score += 0.3;
      reasons.push("Klare Verkaufsabsicht");
    }
    if (/owner|private|privat|first owner|erstbesitz/i.test(text)) {
      score += 0.1;
      reasons.push("Privatverkauf");
    }
  } else if (intent === "buy") {
    if (/looking to buy|want to buy|suche|möchte kaufen/i.test(text)) {
      score += 0.3;
      reasons.push("Kaufabsicht");
    }
  } else if (intent === "charter") {
    if (/looking to charter|want to charter|seeking charter/i.test(text)) {
      score += 0.3;
      reasons.push("Charter-Anfrage");
    }
  }

  // Brand recognition
  let brand: string | null = null;
  for (const b of BRANDS) {
    if (new RegExp(`\\b${b}\\b`, "i").test(text)) {
      brand = b;
      score += 0.1;
      reasons.push(`Marke erkannt: ${b}`);
      break;
    }
  }

  // Model — first capitalized word after brand
  let model: string | null = null;
  if (brand) {
    const m = text.match(new RegExp(`${brand}\\s+([\\w./-]+(?:\\s+[\\w./-]+){0,2})`, "i"));
    if (m) model = m[1].trim().replace(/[,.;]$/, "").slice(0, 40);
  }

  // Year
  const yearMatch = text.match(/\b(19[8-9]\d|20[0-2]\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : null;

  // Price
  let asking_price: number | null = null;
  let currency = "EUR";
  const priceMatch = text.match(/(?:€|EUR|\$|USD|£|GBP)\s*([\d,.']+)|([\d,.']+)\s*(?:€|EUR|\$|USD|£|GBP)/i);
  if (priceMatch) {
    const raw = (priceMatch[1] || priceMatch[2] || "").replace(/[,.']/g, "");
    const num = parseInt(raw);
    if (!isNaN(num) && num >= 5000 && num <= 100_000_000) {
      asking_price = num;
      if (/\$|USD/i.test(text)) currency = "USD";
      else if (/£|GBP/i.test(text)) currency = "GBP";
      score += 0.1;
      reasons.push("Preis angegeben");
    }
  }

  // Length
  let length_m: number | null = null;
  const lengthMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m\b|meter)|(\d+(?:[.,]\d+)?)\s*(?:ft|feet|foot)/i);
  if (lengthMatch) {
    if (lengthMatch[1]) length_m = parseFloat(lengthMatch[1].replace(",", "."));
    else if (lengthMatch[2]) length_m = parseFloat(lengthMatch[2].replace(",", ".")) / 3.281;
  }

  // Country detection
  let country: string | null = null;
  for (const [rx, c] of COUNTRY_RX) {
    if (rx.test(text)) {
      country = c;
      break;
    }
  }

  // Location — common patterns
  let location: string | null = null;
  const locMatch = text.match(/\b(?:in|at|from|located in)\s+([A-Z][a-zA-Z\s-]{2,30})/);
  if (locMatch) location = locMatch[1].trim();

  // Poster handle / contact
  let poster_handle: string | null = null;
  let contact_phone: string | null = null;
  let contact_email: string | null = null;

  if (platform === "instagram") {
    const m = r.link.match(/instagram\.com\/([^\/]+)/);
    if (m && m[1] !== "p" && m[1] !== "reel") poster_handle = "@" + m[1];
  } else if (platform === "twitter") {
    const m = r.link.match(/twitter\.com\/([^\/]+)/);
    if (m && m[1] !== "i") poster_handle = "@" + m[1];
  } else if (platform === "reddit") {
    const m = r.link.match(/reddit\.com\/(?:r\/[^\/]+\/comments|user)\/([^\/]+)/);
    if (m) poster_handle = "u/" + m[1];
  }

  // Phone / email in text
  const phoneMatch = text.match(/(\+?\d[\d\s().-]{7,18}\d)/);
  if (phoneMatch) contact_phone = phoneMatch[1].trim();
  const emailMatch = text.match(/[\w.-]+@[\w-]+\.[\w.-]+/);
  if (emailMatch) contact_email = emailMatch[0];

  // Source post ID — try to extract from URL
  let source_post_id: string | null = null;
  try {
    const url = new URL(r.link);
    const path = url.pathname;
    // Heuristic: take the last meaningful path segment
    const segments = path.split("/").filter(Boolean);
    if (segments.length > 0) {
      source_post_id = segments[segments.length - 1].slice(0, 60);
    }
  } catch { /* ignore */ }

  // Language detection (simple)
  const language = /\b(zu verkaufen|verkaufe|deutsch|preis)/i.test(lower) ? "de"
    : /\b(à vendre|vendre|prix)/i.test(lower) ? "fr"
    : /\b(en venta|vender)/i.test(lower) ? "es"
    : "en";

  return {
    intent,
    source_platform: platform,
    source_url: r.link,
    source_post_id,
    brand,
    model,
    year,
    length_m,
    asking_price,
    currency,
    location,
    country,
    poster_handle,
    contact_phone,
    contact_email,
    raw_text: text.slice(0, 1000),
    language,
    quality_score: Math.min(1, Math.round(score * 100) / 100),
    quality_reasons: reasons,
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

  const count = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get("count") || "10")), LEAD_QUERIES.length);
  const startAtParam = req.nextUrl.searchParams.get("startAt");
  const hour = new Date().getUTCHours();
  const startIdx =
    startAtParam !== null
      ? Math.max(0, parseInt(startAtParam)) % LEAD_QUERIES.length
      : (hour * count) % LEAD_QUERIES.length;

  const queries = Array.from({ length: count }, (_, i) => LEAD_QUERIES[(startIdx + i) % LEAD_QUERIES.length]);

  // Run searches in parallel, then parse + dedupe
  const allResults = await Promise.allSettled(
    queries.map(async (spec) => {
      const results = await serperSearch(spec.q, 10);
      return results.map((r) => parseLead(r, spec.intent, spec.platform)).filter(Boolean);
    })
  );

  const leads = allResults
    .filter((r): r is PromiseFulfilledResult<NonNullable<ReturnType<typeof parseLead>>[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  // Dedupe by source_url
  const seen = new Set<string>();
  const unique = leads.filter((l) => {
    if (seen.has(l!.source_url)) return false;
    seen.add(l!.source_url);
    return true;
  });

  // Pre-fetch existing broker-lead source_urls so we skip dupes (we store in
  // analytics_events because the dedicated broker_leads table isn't created yet).
  const existing = await db
    .from("analytics_events")
    .select("entity_id")
    .eq("event_type", "broker_lead");
  const existingIds = new Set<string>(
    ((existing.data as { entity_id: string | null }[] | null) || []).map((r) => r.entity_id || "")
  );

  let inserted = 0;
  let lastError: string | null = null;
  for (const lead of unique) {
    if (!lead) continue;
    if (lead.quality_score < 0.5) continue;

    // Stable hash-ish id — source_post_id or url-derived
    const entityId = lead.source_post_id || lead.source_url.slice(-60);
    if (existingIds.has(entityId)) continue;

    const { error } = await db.from("analytics_events").insert({
      event_type: "broker_lead",
      entity_type: "broker_lead",
      entity_id: entityId,
      entity_name: [lead.brand, lead.model].filter(Boolean).join(" ") || "Boot",
      country: lead.country,
      properties: {
        intent: lead.intent,
        source_platform: lead.source_platform,
        source_url: lead.source_url,
        brand: lead.brand,
        model: lead.model,
        year: lead.year,
        length_m: lead.length_m,
        asking_price: lead.asking_price,
        currency: lead.currency,
        location: lead.location,
        poster_handle: lead.poster_handle,
        contact_phone: lead.contact_phone,
        contact_email: lead.contact_email,
        raw_text: lead.raw_text,
        language: lead.language,
        quality_score: lead.quality_score,
        quality_reasons: lead.quality_reasons,
        status: "new",
      },
    });
    if (!error) {
      inserted++;
      existingIds.add(entityId);
    } else if (!lastError) lastError = error.message;
  }

  return NextResponse.json({
    ok: true,
    queries: queries.map((q) => q.q),
    rawHits: leads.length,
    qualified: unique.filter((l) => l && l.quality_score >= 0.5).length,
    inserted,
    lastError,
    sample: unique.slice(0, 5).map((l) => ({
      platform: l?.source_platform,
      brand: l?.brand,
      model: l?.model,
      price: l?.asking_price,
      country: l?.country,
      score: l?.quality_score,
      url: l?.source_url,
    })),
  });
}
