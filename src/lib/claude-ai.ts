import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    const key = process.env.BOAT_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("BOAT_ANTHROPIC_KEY is not set");
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}

export interface ParsedUserQuery {
  intent: "charter" | "buy" | "explore";
  region?: string;
  country?: string;
  budget_max?: number;
  currency: string;
  boat_type?: string;
  guests?: number;
  date?: string;
  style?: string;
  keywords: string[];
  raw: string;
  corrected_query?: string;
}

export interface ExtractedListing {
  name: string;
  type: string;
  brand?: string;
  model?: string;
  year?: number;
  length_ft?: number;
  cabins?: number;
  guests?: number;
  crew?: number;
  price_per_week?: number;
  price_per_day?: number;
  sale_price?: number;
  currency: string;
  region: string;
  country: string;
  port?: string;
  features: string[];
  description: string;
  source_url: string;
  source_title: string;
  luxury_level: number;
  match_score: number;
  match_reasons: string[];
  ai_summary: string;
  image_url?: string;
}

export async function parseUserQuery(raw: string): Promise<ParsedUserQuery> {
  const msg = await getClient().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Parse this yacht/boat search query into structured JSON. Extract all information you can find.

Query: "${raw}"

IMPORTANT: First, correct any spelling mistakes or typos in the query. Then parse the corrected version.
If the query has spelling errors, include a "corrected_query" field with the fixed version.
Examples: "Yacth" → "Yacht", "Crotia" → "Croatia", "chartr" → "charter", "Mimai" → "Miami"

Return ONLY valid JSON with this exact structure:
{
  "intent": "charter" | "buy" | "explore",
  "region": "string or null",
  "country": "string or null",
  "budget_max": number or null,
  "currency": "EUR" | "USD" | "GBP",
  "boat_type": "motor" | "sailing" | "catamaran" | "superyacht" | "speedboat" | "gulet" or null,
  "guests": number or null,
  "date": "YYYY-MM-DD or null",
  "style": "luxury" | "family" | "party" | "sport" | "adventure" | "romantic" or null,
  "keywords": ["array", "of", "keywords"],
  "corrected_query": "corrected version if there were typos, or null if query was fine"
}`,
      },
    ],
  });

  const text =
    msg.content[0].type === "text" ? msg.content[0].text : "";
  const json = JSON.parse(
    text.replace(/```json?\n?/g, "").replace(/```/g, "").trim()
  );

  return {
    ...json,
    currency: json.currency || "EUR",
    keywords: json.keywords || [],
    corrected_query: json.corrected_query || undefined,
    raw,
  };
}

export async function extractBoatsFromPages(
  pages: { url: string; title: string; content: string }[],
  parsedQuery: ParsedUserQuery
): Promise<ExtractedListing[]> {
  const pagesText = pages
    .map(
      (p, i) =>
        `=== PAGE ${i + 1} ===\nURL: ${p.url}\nTitle: ${p.title}\nContent:\n${p.content}\n`
    )
    .join("\n");

  const msg = await getClient().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are the world's best yacht discovery AI. You are given text content scraped from yacht listing websites.
Your job: find SPECIFIC, INDIVIDUAL, REAL boats/yachts with their actual names and real data.

USER SEARCH: "${parsedQuery.raw}"
INTENT: ${parsedQuery.intent}
BUDGET: ${parsedQuery.budget_max ? `${parsedQuery.currency} ${parsedQuery.budget_max}` : "not specified"}
LOCATION: ${parsedQuery.country || parsedQuery.region || "not specified"}
TYPE: ${parsedQuery.boat_type || "any"}
GUESTS: ${parsedQuery.guests || "not specified"}
DATE: ${parsedQuery.date || "flexible"}

PAGE CONTENTS:
${pagesText}

CRITICAL RULES:
- Extract ONLY real, named boats (e.g. "M/Y SERENITY", "Lagoon 52 Flybridge", "Azimut Grande 35 METROS")
- NEVER invent boats or make up names. Only use data you see in the text.
- Each result MUST be a specific individual yacht — NOT a platform, category, or generic description
- DIVERSIFY: try to find boats from DIFFERENT pages/sources. Do not return 5 boats from the same page if you have data from multiple pages.
- source_url: use the page URL. If you see a direct link to the boat's detail page in the text, prefer that.
- If you find an image URL (https://...jpg/png/webp) associated with a boat, include it as "image_url"
- Prices: be accurate. If listed per day, set price_per_day. If per week, set price_per_week. If for sale, set sale_price.
- match_score: 0.0 to 1.0 based on how well it matches the user's criteria (budget, location, type, guests)

Return ONLY a valid JSON array (max 10 boats):
[{
  "name": "actual yacht name from page",
  "type": "motor|sailing|catamaran|superyacht|speedboat|gulet",
  "brand": "builder/brand if mentioned",
  "model": "model if mentioned",
  "year": 2024,
  "length_ft": 85,
  "cabins": 4,
  "guests": 10,
  "crew": 3,
  "price_per_week": 50000,
  "price_per_day": null,
  "sale_price": null,
  "currency": "EUR",
  "region": "Mediterranean",
  "country": "Croatia",
  "port": "Split",
  "features": ["Jacuzzi", "Jet ski", "Flybridge"],
  "description": "Brief factual description from the page",
  "source_url": "URL where found",
  "source_title": "page title",
  "image_url": "direct image URL if found, or null",
  "luxury_level": 4,
  "match_score": 0.85,
  "match_reasons": ["Budget match", "Location match", "Right size"],
  "ai_summary": "One sentence: why this boat matches this specific search"
}]

If no specific boats found, return [].
IMPORTANT: Return boats from AS MANY DIFFERENT sources as possible.`,
      },
    ],
  });

  const text =
    msg.content[0].type === "text" ? msg.content[0].text : "[]";

  try {
    const cleaned = text
      .replace(/```json?\n?/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}

export async function extractListingsFromSearchResults(
  searchResults: { title: string; link: string; snippet: string }[],
  parsedQuery: ParsedUserQuery
): Promise<ExtractedListing[]> {
  const resultsText = searchResults
    .map(
      (r, i) =>
        `[${i + 1}] "${r.title}"\nURL: ${r.link}\nSnippet: ${r.snippet}`
    )
    .join("\n\n");

  const msg = await getClient().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are a yacht discovery AI. Analyze these Google search result snippets to find specific, real yacht listings.
Only extract INDIVIDUAL, NAMED yachts — never platforms, categories, or articles.

USER SEARCH: "${parsedQuery.raw}"
INTENT: ${parsedQuery.intent}
BUDGET: ${parsedQuery.budget_max ? `${parsedQuery.currency} ${parsedQuery.budget_max}` : "not specified"}
LOCATION: ${parsedQuery.country || parsedQuery.region || "not specified"}
TYPE: ${parsedQuery.boat_type || "any"}
GUESTS: ${parsedQuery.guests || "not specified"}

SEARCH RESULTS:
${resultsText}

Extract up to 6 specific yacht listings from DIFFERENT sources/URLs.
Only include boats where the snippet clearly mentions a specific vessel name or model.
Return ONLY a valid JSON array:
[{
  "name": "specific yacht name from snippet",
  "type": "motor|sailing|catamaran|superyacht|speedboat|gulet",
  "brand": "builder or null",
  "model": "model or null",
  "year": null,
  "length_ft": null,
  "cabins": null,
  "guests": null,
  "crew": null,
  "price_per_week": null,
  "price_per_day": null,
  "sale_price": null,
  "currency": "EUR",
  "region": "region",
  "country": "country",
  "port": "port or null",
  "features": [],
  "description": "brief description from snippet",
  "source_url": "the search result URL",
  "source_title": "search result title",
  "image_url": null,
  "luxury_level": 3,
  "match_score": 0.70,
  "match_reasons": ["reason"],
  "ai_summary": "why this matches the search"
}]`,
      },
    ],
  });

  const text =
    msg.content[0].type === "text" ? msg.content[0].text : "[]";

  try {
    const cleaned = text
      .replace(/```json?\n?/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}
