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
 *           ?count=N  (default 12, max 40)
 */

// ═══════════════════════════════════════════════════════════
// SALE-BOAT SOURCES — every meaningful platform globally
// Used as a positive allowlist when filtering Serper results.
// ═══════════════════════════════════════════════════════════
const SALE_PLATFORMS: { domain: string; lang: string; kind: "marketplace" | "social" | "broker" | "forum" | "classifieds" | "auction" }[] = [
  // ── Marketplaces (specialized yacht sale)
  { domain: "yachtworld.com", lang: "en", kind: "marketplace" },
  { domain: "boattrader.com", lang: "en", kind: "marketplace" },
  { domain: "yachtall.com", lang: "de", kind: "marketplace" },
  { domain: "boat24.com", lang: "de", kind: "marketplace" },
  { domain: "apolloduck.com", lang: "en", kind: "marketplace" },
  { domain: "scanboat.com", lang: "en", kind: "marketplace" },
  { domain: "boats.com", lang: "en", kind: "marketplace" },
  { domain: "yachtfocus.com", lang: "nl", kind: "marketplace" },
  { domain: "boatshop24.com", lang: "en", kind: "marketplace" },
  { domain: "yatco.com", lang: "en", kind: "marketplace" },
  { domain: "denisonyachtsales.com", lang: "en", kind: "marketplace" },
  { domain: "iyba.org", lang: "en", kind: "marketplace" },
  { domain: "ancasta.com", lang: "en", kind: "marketplace" },
  { domain: "yachtbroker.dk", lang: "da", kind: "marketplace" },
  { domain: "yachtmagazin.de", lang: "de", kind: "marketplace" },
  { domain: "12knots.com", lang: "en", kind: "marketplace" },
  { domain: "boatdealers.ca", lang: "en", kind: "marketplace" },
  { domain: "powerandmotoryacht.com", lang: "en", kind: "marketplace" },
  { domain: "sea-magazine.com", lang: "en", kind: "marketplace" },
  { domain: "yachtport.eu", lang: "en", kind: "marketplace" },
  { domain: "annoncesbateaux.com", lang: "fr", kind: "marketplace" },
  { domain: "bateaux-occasion.fr", lang: "fr", kind: "marketplace" },
  { domain: "youboat.fr", lang: "fr", kind: "marketplace" },
  { domain: "barcoamigo.com", lang: "es", kind: "marketplace" },
  { domain: "nauticexpo.com", lang: "en", kind: "marketplace" },
  { domain: "topboats.com", lang: "es", kind: "marketplace" },
  { domain: "yachtonline.com", lang: "it", kind: "marketplace" },
  { domain: "barchedoccasione.it", lang: "it", kind: "marketplace" },
  { domain: "godryad.com", lang: "en", kind: "marketplace" },

  // ── Classifieds / general marketplaces
  { domain: "ebay-kleinanzeigen.de", lang: "de", kind: "classifieds" },
  { domain: "kleinanzeigen.de", lang: "de", kind: "classifieds" },
  { domain: "quoka.de", lang: "de", kind: "classifieds" },
  { domain: "ebay.com", lang: "en", kind: "classifieds" },
  { domain: "ebay.de", lang: "de", kind: "classifieds" },
  { domain: "ebay.co.uk", lang: "en", kind: "classifieds" },
  { domain: "leboncoin.fr", lang: "fr", kind: "classifieds" },
  { domain: "milanuncios.com", lang: "es", kind: "classifieds" },
  { domain: "subito.it", lang: "it", kind: "classifieds" },
  { domain: "gumtree.com", lang: "en", kind: "classifieds" },
  { domain: "marktplaats.nl", lang: "nl", kind: "classifieds" },
  { domain: "olx.pl", lang: "pl", kind: "classifieds" },
  { domain: "blocket.se", lang: "sv", kind: "classifieds" },
  { domain: "finn.no", lang: "no", kind: "classifieds" },
  { domain: "dba.dk", lang: "da", kind: "classifieds" },
  { domain: "willhaben.at", lang: "de", kind: "classifieds" },
  { domain: "tutti.ch", lang: "de", kind: "classifieds" },
  { domain: "anibis.ch", lang: "de", kind: "classifieds" },
  { domain: "craigslist.org", lang: "en", kind: "classifieds" },

  // ── Auction houses
  { domain: "bandb-yachts.com", lang: "en", kind: "auction" },
  { domain: "bonhams.com", lang: "en", kind: "auction" },
  { domain: "bringatrailer.com", lang: "en", kind: "auction" },

  // ── Broker websites
  { domain: "northropandjohnson.com", lang: "en", kind: "broker" },
  { domain: "fraseryachts.com", lang: "en", kind: "broker" },
  { domain: "burgessyachts.com", lang: "en", kind: "broker" },
  { domain: "edmiston.com", lang: "en", kind: "broker" },
  { domain: "ycoss.com", lang: "en", kind: "broker" },
  { domain: "yachtcharterfleet.com", lang: "en", kind: "broker" },
  { domain: "imperial-yachts.com", lang: "en", kind: "broker" },
  { domain: "moranyachts.com", lang: "en", kind: "broker" },
  { domain: "camperandnicholsons.com", lang: "en", kind: "broker" },
  { domain: "iyc.com", lang: "en", kind: "broker" },
  { domain: "yachtbrokers.com.au", lang: "en", kind: "broker" },

  // ── Forums (often sell-by-owner threads)
  { domain: "boote-forum.de", lang: "de", kind: "forum" },
  { domain: "segelfreunde.de", lang: "de", kind: "forum" },
  { domain: "cruisersforum.com", lang: "en", kind: "forum" },
  { domain: "sailboatowners.com", lang: "en", kind: "forum" },
  { domain: "sailinganarchy.com", lang: "en", kind: "forum" },
  { domain: "boatdesign.net", lang: "en", kind: "forum" },
  { domain: "trawlerforum.com", lang: "en", kind: "forum" },

  // ── Social media
  { domain: "facebook.com", lang: "en", kind: "social" },
  { domain: "instagram.com", lang: "en", kind: "social" },
  { domain: "linkedin.com", lang: "en", kind: "social" },
  { domain: "twitter.com", lang: "en", kind: "social" },
  { domain: "x.com", lang: "en", kind: "social" },
  { domain: "reddit.com", lang: "en", kind: "social" },
  { domain: "youtube.com", lang: "en", kind: "social" },
  { domain: "tiktok.com", lang: "en", kind: "social" },
  { domain: "pinterest.com", lang: "en", kind: "social" },
];

// ═══════════════════════════════════════════════════════════
// QUERIES — rotate through these per cron run
// Covers: language variants, brand-specific, type-specific,
// social-media intent, regional, broker-specific.
// ═══════════════════════════════════════════════════════════
const SCRAPE_QUERIES = [
  // Generic sale phrases — global
  { type: "motorboat", q: "motor yacht for sale Mediterranean" },
  { type: "sailboat", q: "sailing yacht for sale Europe" },
  { type: "catamaran", q: "catamaran for sale" },
  { type: "yacht", q: "superyacht for sale" },
  { type: "yacht", q: "luxury yacht for sale" },
  { type: "motorboat", q: "yacht broker listing 2025" },

  // German
  { type: "motorboat", q: "Motoryacht zu verkaufen" },
  { type: "sailboat", q: "Segelyacht zu verkaufen Deutschland" },
  { type: "catamaran", q: "Katamaran kaufen gebraucht" },
  { type: "yacht", q: "Yacht zu verkaufen Mittelmeer" },
  { type: "motorboat", q: "Motorboot kaufen Privat" },

  // French
  { type: "motorboat", q: "yacht à vendre Méditerranée" },
  { type: "sailboat", q: "voilier à vendre occasion" },
  { type: "catamaran", q: "catamaran à vendre Antilles" },

  // Spanish / Italian
  { type: "motorboat", q: "yate en venta España" },
  { type: "sailboat", q: "velero en venta usado" },
  { type: "motorboat", q: "yacht in vendita Italia" },
  { type: "sailboat", q: "barca a vela in vendita" },

  // Brand-specific (top European/global brands)
  { type: "motorboat", q: "Sunseeker for sale" },
  { type: "motorboat", q: "Princess Yachts for sale" },
  { type: "motorboat", q: "Azimut for sale" },
  { type: "motorboat", q: "Ferretti yacht for sale" },
  { type: "motorboat", q: "Pershing yacht for sale" },
  { type: "motorboat", q: "Riva yacht for sale" },
  { type: "motorboat", q: "Sanlorenzo for sale" },
  { type: "motorboat", q: "Benetti yacht for sale" },
  { type: "motorboat", q: "Custom Line yacht for sale" },
  { type: "motorboat", q: "Fairline for sale" },
  { type: "motorboat", q: "Galeon yacht for sale" },
  { type: "motorboat", q: "Prestige yacht for sale" },
  { type: "motorboat", q: "Absolute Yachts for sale" },
  { type: "motorboat", q: "Cranchi for sale" },
  { type: "sailboat", q: "Beneteau Oceanis for sale" },
  { type: "sailboat", q: "Jeanneau Sun Odyssey for sale" },
  { type: "sailboat", q: "Bavaria sailing yacht for sale" },
  { type: "sailboat", q: "Hanse yacht for sale" },
  { type: "sailboat", q: "Dufour yacht for sale" },
  { type: "sailboat", q: "Hallberg Rassy for sale" },
  { type: "sailboat", q: "X-Yachts for sale" },
  { type: "sailboat", q: "Oyster yacht for sale" },
  { type: "catamaran", q: "Lagoon catamaran for sale" },
  { type: "catamaran", q: "Bali catamaran for sale" },
  { type: "catamaran", q: "Fountaine Pajot for sale" },
  { type: "catamaran", q: "Leopard catamaran for sale" },
  { type: "catamaran", q: "Sunreef catamaran for sale" },
  { type: "catamaran", q: "Nautitech for sale" },

  // Social media — Facebook Marketplace
  { type: "motorboat", q: 'site:facebook.com/marketplace yacht for sale' },
  { type: "sailboat", q: 'site:facebook.com/marketplace sailboat for sale' },
  { type: "catamaran", q: 'site:facebook.com/marketplace catamaran for sale' },
  { type: "motorboat", q: 'site:facebook.com/marketplace motoryacht zu verkaufen' },
  { type: "motorboat", q: 'site:facebook.com "yacht for sale" 2025' },
  { type: "sailboat", q: 'site:facebook.com "sailboat for sale by owner"' },

  // Instagram (hashtags & captions)
  { type: "motorboat", q: 'site:instagram.com "#yachtforsale"' },
  { type: "motorboat", q: 'site:instagram.com "#boatforsale"' },
  { type: "sailboat", q: 'site:instagram.com "#sailingyachtforsale"' },
  { type: "catamaran", q: 'site:instagram.com "#catamaranforsale"' },
  { type: "yacht", q: 'site:instagram.com "#superyachtforsale"' },
  { type: "motorboat", q: 'site:instagram.com "for sale" yacht 2025' },

  // LinkedIn (broker posts)
  { type: "motorboat", q: 'site:linkedin.com "yacht for sale" 2025' },
  { type: "motorboat", q: 'site:linkedin.com "now available" yacht broker' },
  { type: "motorboat", q: 'site:linkedin.com "price reduced" yacht' },
  { type: "sailboat", q: 'site:linkedin.com "new listing" sailing yacht' },

  // Reddit
  { type: "motorboat", q: 'site:reddit.com/r/sailing "for sale"' },
  { type: "motorboat", q: 'site:reddit.com/r/boating "selling"' },
  { type: "motorboat", q: 'site:reddit.com/r/yachting "for sale"' },
  { type: "motorboat", q: 'site:reddit.com/r/Catamaran "for sale"' },
  { type: "sailboat", q: 'site:reddit.com "sailboat for sale" 2025' },

  // X / Twitter
  { type: "motorboat", q: 'site:x.com "yacht for sale" 2025' },
  { type: "motorboat", q: 'site:twitter.com "for sale by owner" yacht' },

  // YouTube (yacht-tour channels often list)
  { type: "motorboat", q: 'site:youtube.com "yacht tour" "for sale"' },
  { type: "sailboat", q: 'site:youtube.com "sailing yacht tour" "for sale"' },
  { type: "catamaran", q: 'site:youtube.com "catamaran tour" "for sale"' },

  // TikTok
  { type: "motorboat", q: 'site:tiktok.com yachtforsale' },

  // Classifieds (German)
  { type: "motorboat", q: 'site:kleinanzeigen.de motoryacht verkaufen' },
  { type: "sailboat", q: 'site:kleinanzeigen.de segelyacht' },
  { type: "motorboat", q: 'site:ebay-kleinanzeigen.de motorboot' },
  { type: "motorboat", q: 'site:quoka.de yacht verkaufen' },

  // Classifieds (French / Spanish / Italian / Dutch / Nordic)
  { type: "motorboat", q: 'site:leboncoin.fr yacht à vendre' },
  { type: "sailboat", q: 'site:leboncoin.fr voilier à vendre' },
  { type: "motorboat", q: 'site:milanuncios.com yate venta' },
  { type: "motorboat", q: 'site:subito.it barca vendita' },
  { type: "motorboat", q: 'site:marktplaats.nl jacht te koop' },
  { type: "motorboat", q: 'site:finn.no båt til salgs' },
  { type: "motorboat", q: 'site:blocket.se båt till salu' },
  { type: "motorboat", q: 'site:dba.dk båd til salg' },
  { type: "motorboat", q: 'site:willhaben.at motorboot verkaufen' },

  // Forums
  { type: "sailboat", q: 'site:cruisersforum.com "for sale by owner"' },
  { type: "motorboat", q: 'site:boote-forum.de "verkaufe meine"' },
  { type: "sailboat", q: 'site:sailboatowners.com classifieds' },
  { type: "motorboat", q: 'site:trawlerforum.com for sale' },

  // Luxury / regional
  { type: "yacht", q: "yacht for sale Monaco" },
  { type: "yacht", q: "yacht for sale Dubai" },
  { type: "yacht", q: "yacht for sale Antibes" },
  { type: "yacht", q: "yacht for sale Palma" },
  { type: "yacht", q: "yacht for sale Fort Lauderdale" },
  { type: "yacht", q: "yacht for sale Miami" },
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
    // If the query already has `site:` operator, trust it. Otherwise scope to
    // a SHORT list of high-priority marketplaces (Google rejects 80-domain ORs).
    const hasSiteOp = /\bsite:/i.test(q);
    let finalQ = q;
    if (!hasSiteOp) {
      const top = SALE_PLATFORMS
        .filter((p) => p.kind === "marketplace" || p.kind === "broker")
        .slice(0, 15)
        .map((p) => `site:${p.domain}`)
        .join(" OR ");
      finalQ = `${q} (${top})`;
    }
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: finalQ, num: limit }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Accept anything from a known platform OR with a recognizable yacht keyword.
    // (Social-media URLs are kept regardless — we filter junk later via the parser.)
    return (data.organic || []).filter((r: SerperResult) => {
      try {
        const host = new URL(r.link).hostname.replace("www.", "");
        if (SALE_PLATFORMS.some((p) => host.includes(p.domain))) return true;
        // For unknown domains, require yacht/boat/sale signal in title or snippet
        const text = `${r.title} ${r.snippet || ""}`.toLowerCase();
        return /yacht|boat|sail|catamaran|motoryacht|segelyacht|boot|barca|bateau|velero/.test(text)
          && /for sale|zu verkaufen|à vendre|en venta|in vendita|te koop/.test(text);
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
  let pathname = "";
  try {
    const u = new URL(r.link);
    domain = u.hostname.replace("www.", "");
    pathname = u.pathname;
  } catch { return null; }

  // REJECT category / search / listing-index pages — these are not concrete
  // boat ads. We're VERY aggressive here because Google ranks category pages
  // higher than individual listings — we'd rather have FEWER sale boats with
  // correct links than MANY broken category links.
  const path = pathname.toLowerCase();
  const isCategoryUrl =
    // Anywhere a category prefix appears
    /\/(boats?-for-sale|yachts?-for-sale|boats?|yachts?)\/(make|type|category|condition|class|brand|model|country|state|city|region|worldregion|year|length|hull)-[^/]+/i.test(path) ||
    // Path-level category endings
    /\/(make|type|category|condition|class|brand|model)-[^/]+\/?$/i.test(path) ||
    // Browse/index pages
    /\/(boats-for-sale|yachts-for-sale|boats|yachts|search|listing|find|browse|all)\/?$/i.test(path) ||
    // boat24.com / yachtall.com category pattern
    /\/(motoryachten?|segelyachten?|motorboote?|segelboote?|katamarane?)\/[^/]+\/?$/i.test(path) ||
    // <2 segments = likely homepage / category
    pathname.split("/").filter(Boolean).length < 2;

  const titleLower = r.title.toLowerCase();
  const isGenericCatTitle =
    /(boats? for sale|yachts? for sale|zu verkaufen|à vendre|en venta|in vendita)\s*(in|-|\b)/i.test(r.title.trim()) ||
    /\b(boats? for sale|yachts? for sale)\b/i.test(r.title) ||
    /^(motoryachten?|segelyachten?|catamarans?|motorboote?|alle |over \d+|\d+\s*(boats|yachts|angebote|annonces|anuncios))/i.test(titleLower) ||
    /\(neu oder gebraucht\)/i.test(titleLower) ||
    /über \d+\.?\d* angebote/i.test(titleLower);

  if (isCategoryUrl || isGenericCatTitle) return null;

  // Positive listing-indicator path segments (any of these means it's a
  // concrete ad, not a category)
  const isPositiveListing =
    /\/(yacht|boat|boats|barca|bateau|veleros?|inserate|inserat|listing|ad|annonce|annunci|anuncio|advertentie|advert|product|item|p|post|status|reel|watch|video)\/[^/]+/i.test(path) ||
    /\/(boots?|sailing|motor|catamaran)-[^/]+-\d/i.test(path) ||
    // long detail slugs (≥4 dash-separated tokens) are almost always real listings
    pathname.split("/").pop()!.split("-").length >= 4;

  if (!isPositiveListing) return null;

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
  const SOCIAL_DOMAINS = ["facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com", "reddit.com", "youtube.com", "tiktok.com", "pinterest.com"];
  const CLASSIFIEDS_DOMAINS = ["kleinanzeigen.de", "ebay-kleinanzeigen.de", "leboncoin.fr", "milanuncios.com", "subito.it", "marktplaats.nl"];

  for (const r of results) {
    const parsed = parseSerperResult(r, spec.type);
    if (!parsed) continue;

    let domain = "";
    try { domain = new URL(r.link).hostname.replace("www.", ""); } catch { continue; }

    const isSocial = SOCIAL_DOMAINS.some((d) => domain.includes(d));
    const isClassifieds = CLASSIFIEDS_DOMAINS.some((d) => domain.includes(d));

    // For specialized marketplaces: REQUIRE a price (otherwise data quality is junk).
    // For social media / classifieds / forums: accept without price (Preis auf Anfrage).
    if (!parsed.sale_price && !isSocial && !isClassifieds) continue;
    const finalPrice = parsed.sale_price ?? 0; // 0 = on request

    const slug = slugify(`${parsed.brand || ""}-${parsed.model || ""}-${parsed.year || ""}-${domain}-${r.link.slice(-12)}`);

    const row = {
      name: parsed.name,
      slug,
      boat_type: spec.type,
      brand: parsed.brand,
      model: parsed.model,
      year: parsed.year,
      length_m: parsed.length_m,
      sale_price: finalPrice,
      currency: parsed.currency,
      location: parsed.location,
      country: parsed.country,
      condition: parsed.year && parsed.year >= 2024 ? "new" : parsed.year && parsed.year >= 2018 ? "like_new" : "good",
      features: [],
      images: [],
      description: parsed.description.slice(0, 500),
      detail_url: r.link,
      source_domain: domain,
      source: isSocial ? "social_media" : isClassifieds ? "classifieds" : "marketplace",
      price_negotiable: !parsed.sale_price,
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
      // event_type must be from allowed set; use 'boat_save' + entity_type discriminator
      const { error } = await db.from("analytics_events").insert({
        user_id: alert.user_id,
        event_type: "boat_save",
        entity_type: "sale_alert",
        entity_id: String(boat.id),
        entity_name: String(boat.name || ""),
        country: boat.country ? String(boat.country) : null,
        metadata: {
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

  const count = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get("count") || "12")), 40);
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
