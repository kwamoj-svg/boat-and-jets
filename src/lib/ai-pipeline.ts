import type { ParsedQuery, Listing, Recommendation, MatchReason } from "@/types";

/**
 * AI Pipeline Architecture
 *
 * Stage 1: Query Analysis — parse natural language into structured intent
 * Stage 2: Web Discovery — search and scrape listings (future: real scraping)
 * Stage 3: Normalization — deduplicate boats across sources
 * Stage 4: AI Ranking — score and rank by match quality
 * Stage 5: Recommendation — generate explanations
 */

// ━━━━━━━━━━━━━━━━━━━ STAGE 1: QUERY ANALYSIS ━━━━━━━━━━━━━━━━━━━

const REGION_MAP: Record<string, { region: string; country: string }> = {
  croatia: { region: "Mediterranean", country: "Croatia" },
  greece: { region: "Mediterranean", country: "Greece" },
  dubai: { region: "Middle East", country: "UAE" },
  monaco: { region: "Mediterranean", country: "France" },
  ibiza: { region: "Mediterranean", country: "Spain" },
  turkey: { region: "Mediterranean", country: "Turkey" },
  caribbean: { region: "Caribbean", country: "BVI" },
  italy: { region: "Mediterranean", country: "Italy" },
  france: { region: "Mediterranean", country: "France" },
  spain: { region: "Mediterranean", country: "Spain" },
  maldives: { region: "Indian Ocean", country: "Maldives" },
  thailand: { region: "Southeast Asia", country: "Thailand" },
};

const BOAT_TYPE_MAP: Record<string, ParsedQuery["boat_type"]> = {
  sailing: "sailing",
  sailboat: "sailing",
  motor: "motor",
  motorboat: "motor",
  catamaran: "catamaran",
  superyacht: "superyacht",
  mega: "superyacht",
  speedboat: "speedboat",
  sport: "speedboat",
  gulet: "gulet",
};

export function analyzeQuery(rawQuery: string): ParsedQuery {
  const q = rawQuery.toLowerCase();
  const words = q.split(/\s+/);

  let intent: ParsedQuery["intent"] = "charter";
  if (q.includes("buy") || q.includes("purchase") || q.includes("sale")) intent = "buy";
  if (q.includes("explore") || q.includes("browse")) intent = "explore";

  let region: string | undefined;
  let country: string | undefined;
  for (const [key, val] of Object.entries(REGION_MAP)) {
    if (q.includes(key)) {
      region = val.region;
      country = val.country;
      break;
    }
  }

  let boat_type: ParsedQuery["boat_type"];
  for (const [key, val] of Object.entries(BOAT_TYPE_MAP)) {
    if (q.includes(key)) {
      boat_type = val;
      break;
    }
  }

  let luxury_level: ParsedQuery["luxury_level"];
  if (q.includes("luxury") || q.includes("premium") || q.includes("vip")) luxury_level = 5;
  else if (q.includes("comfort") || q.includes("nice")) luxury_level = 3;

  const guestMatch = q.match(/(\d+)\s*(?:guests?|people|persons?|pax)/);
  const guests = guestMatch ? parseInt(guestMatch[1]) : undefined;

  let budget_max: number | undefined;
  const budgetMatch = q.match(/(?:under|below|max|budget)\s*(?:€|\$|EUR|USD)?\s*([\d,.]+)\s*k?/i);
  if (budgetMatch) {
    budget_max = parseFloat(budgetMatch[1].replace(/,/g, ""));
    if (q.includes("k")) budget_max *= 1000;
  }

  let style: string | undefined;
  if (q.includes("party")) style = "party";
  else if (q.includes("family")) style = "family";
  else if (q.includes("romantic") || q.includes("honeymoon")) style = "romantic";
  else if (q.includes("corporate") || q.includes("business")) style = "corporate";
  else if (q.includes("adventure") || q.includes("diving")) style = "adventure";

  return {
    intent,
    region,
    country,
    budget_max,
    currency: "EUR",
    boat_type,
    guests,
    style,
    luxury_level,
    keywords: words.filter((w) => w.length > 3),
  };
}

// ━━━━━━━━━━━━━━━━━━━ STAGE 4: AI RANKING ━━━━━━━━━━━━━━━━━━━

export function rankListings(parsed: ParsedQuery, listings: Listing[]): Recommendation[] {
  return listings
    .map((listing) => {
      let score = 0.2;
      const reasons: MatchReason[] = [];

      // Region matching (strongest signal)
      if (parsed.country && listing.country === parsed.country) {
        score += 0.3;
        reasons.push({ category: "region", label: `${listing.port}, ${listing.country}`, strength: "strong" });
      } else if (parsed.region && listing.region === parsed.region) {
        score += 0.15;
        reasons.push({ category: "region", label: `${listing.region} region`, strength: "moderate" });
      }

      // Budget matching
      if (parsed.budget_max && listing.price_per_week) {
        if (listing.price_per_week <= parsed.budget_max) {
          score += 0.15;
          reasons.push({ category: "budget", label: "Within budget", strength: "strong" });
        } else if (listing.price_per_week <= parsed.budget_max * 1.2) {
          score += 0.05;
          reasons.push({ category: "budget", label: "Slightly over budget", strength: "partial" });
        }
      }

      // Boat type matching
      if (parsed.boat_type && listing.boat.type === parsed.boat_type) {
        score += 0.2;
        reasons.push({ category: "type", label: `${listing.boat.type} yacht`, strength: "strong" });
      }

      // Guest count
      if (parsed.guests && listing.boat.guests >= parsed.guests) {
        score += 0.1;
        reasons.push({ category: "size", label: `Fits ${listing.boat.guests} guests`, strength: "strong" });
      }

      // Luxury level
      if (parsed.luxury_level) {
        const diff = Math.abs((listing.luxury_level ?? 3) - parsed.luxury_level);
        if (diff === 0) {
          score += 0.15;
          reasons.push({ category: "luxury", label: `Luxury ${listing.luxury_level}/5`, strength: "strong" });
        } else if (diff === 1) {
          score += 0.07;
          reasons.push({ category: "luxury", label: `Luxury ${listing.luxury_level}/5`, strength: "moderate" });
        }
      }

      // Intent matching
      if (parsed.intent === "charter" && listing.listing_type === "charter") score += 0.05;
      if (parsed.intent === "buy" && listing.listing_type === "sale") score += 0.05;

      // Sponsored boost (B2B model)
      if (listing.is_sponsored) score += 0.03;
      if (listing.is_featured) score += 0.02;

      if (reasons.length === 0) {
        reasons.push({ category: "features", label: "Potential match", strength: "partial" });
      }

      return {
        listing,
        score: Math.min(score, 0.99),
        match_reasons: reasons,
        ai_summary: "",
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ━━━━━━━━━━━━━━━━━━━ STAGE 5: RECOMMENDATION SUMMARIES ━━━━━━━━━━━━━━━━━━━

export function generateRecommendationSummary(rec: Recommendation): string {
  const { listing, match_reasons } = rec;
  const boat = listing.boat;
  const strongReasons = match_reasons.filter((r) => r.strength === "strong");

  let parts: string[] = [];

  parts.push(`${boat.name} — a ${boat.year} ${boat.brand} ${boat.model} (${boat.length_ft}ft)`);

  if (listing.listing_type === "charter" && listing.price_per_week) {
    parts.push(`Charter from €${listing.price_per_week.toLocaleString()}/week in ${listing.port}`);
  } else if (listing.sale_price) {
    parts.push(`For sale at €${listing.sale_price.toLocaleString()} in ${listing.port}`);
  }

  parts.push(`${boat.cabins} cabins · ${boat.guests} guests · ${boat.crew} crew`);

  if (strongReasons.length > 0) {
    const labels = strongReasons.map((r) => r.label).join(", ");
    parts.push(`Strong match: ${labels}`);
  }

  return parts.join(". ") + ".";
}
