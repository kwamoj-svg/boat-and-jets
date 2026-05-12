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

const FAST_MODEL = "claude-haiku-4-5-20251001";

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
    model: FAST_MODEL,
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `You are the search query parser for the world's best yacht discovery engine.
Parse this search query into structured JSON. Be smart about understanding intent.

Query: "${raw}"

RULES:
1. SPELL CHECK: Fix any typos first. "Yacth" → "Yacht", "Crotia" → "Croatia", "chartr" → "charter", "Mimai" → "Miami", "Katamaran" → "catamaran", "segeln" → "sailing"
2. LANGUAGE: Understand German, English, French, Italian, Spanish queries. "Boot mieten Kroatien" = charter in Croatia.
3. INTENT: "mieten/chartern/rent/hire/charter" = charter. "kaufen/buy/for sale" = buy. Everything else = explore.
4. Be generous with extraction — infer what you can from context.

Return ONLY valid JSON:
{
  "intent": "charter" | "buy" | "explore",
  "region": "Mediterranean/Caribbean/Southeast Asia/etc or null",
  "country": "specific country or null",
  "budget_max": number or null,
  "currency": "EUR" | "USD" | "GBP",
  "boat_type": "motor" | "sailing" | "catamaran" | "superyacht" | "speedboat" | "gulet" | "houseboat" or null,
  "guests": number or null,
  "date": "YYYY-MM-DD or null",
  "style": "luxury" | "family" | "party" | "sport" | "adventure" | "romantic" | "corporate" or null,
  "keywords": ["extracted", "keywords"],
  "corrected_query": "corrected version if there were typos, or null"
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
        `=== PAGE ${i + 1} ===\nURL: ${p.url}\nTitle: ${p.title}\nContent:\n${p.content.slice(0, 8000)}\n`
    )
    .join("\n");

  const msg = await getClient().messages.create({
    model: FAST_MODEL,
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `You are the AI engine behind the world's best yacht comparison portal — like Kayak for boats.
You must find EVERY specific, real, bookable/buyable boat mentioned across these pages.

USER SEARCH: "${parsedQuery.corrected_query || parsedQuery.raw}"
INTENT: ${parsedQuery.intent}
BUDGET: ${parsedQuery.budget_max ? `${parsedQuery.currency} ${parsedQuery.budget_max}` : "flexible"}
LOCATION: ${parsedQuery.country || parsedQuery.region || "worldwide"}
TYPE: ${parsedQuery.boat_type || "any"}
GUESTS: ${parsedQuery.guests || "any"}
DATE: ${parsedQuery.date || "flexible"}
STYLE: ${parsedQuery.style || "any"}

PAGE CONTENTS:
${pagesText}

EXTRACTION RULES:
1. Extract EVERY named, specific boat/yacht you can find (e.g. "M/Y SERENITY", "Lagoon 52 AVENTURA", "Sunseeker 76")
2. NEVER invent names. ONLY use real names from the text.
3. MAXIMIZE diversity: extract from ALL different pages/domains, not just one.
4. For source_url: if you find a specific boat detail URL in the text, use it. Otherwise use the page URL.
5. If [IMAGES FOUND ON PAGE: ...] appears, try to match images to boats and include as image_url.
6. Prices: be EXACT. per day → price_per_day. per week → price_per_week. for sale → sale_price. Don't guess.
7. match_score: 0.0-1.0 based on: location match, budget fit, type match, guest capacity, date availability.
8. features: extract real amenities (Jacuzzi, flybridge, jet ski, WiFi, A/C, watermaker, etc.)

Return ONLY a JSON array (find as many as possible, max 12):
[{
  "name": "EXACT yacht name",
  "type": "motor|sailing|catamaran|superyacht|speedboat|gulet",
  "brand": "builder or null",
  "model": "model or null",
  "year": 2024,
  "length_ft": 85,
  "cabins": 4,
  "guests": 10,
  "crew": 3,
  "price_per_week": 50000,
  "price_per_day": null,
  "sale_price": null,
  "currency": "EUR",
  "region": "Dalmatia",
  "country": "Croatia",
  "port": "Split",
  "features": ["Jacuzzi", "Flybridge"],
  "description": "Factual 1-sentence description",
  "source_url": "most specific URL to this boat",
  "source_title": "page title",
  "image_url": "image URL if found, or null",
  "luxury_level": 4,
  "match_score": 0.85,
  "match_reasons": ["Budget match", "Location match"],
  "ai_summary": "Why THIS boat is perfect for THIS search"
}]

Return [] if nothing found. Extract from EVERY page that has boats.`,
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
    model: FAST_MODEL,
    max_tokens: 6000,
    messages: [
      {
        role: "user",
        content: `You are the world's best yacht search engine. Analyze these Google search results and extract specific yacht listings.
This is a comparison portal — find as many real, specific boats as possible from DIFFERENT platforms.

USER SEARCH: "${parsedQuery.corrected_query || parsedQuery.raw}"
INTENT: ${parsedQuery.intent}
BUDGET: ${parsedQuery.budget_max ? `${parsedQuery.currency} ${parsedQuery.budget_max}` : "flexible"}
LOCATION: ${parsedQuery.country || parsedQuery.region || "worldwide"}
TYPE: ${parsedQuery.boat_type || "any"}
GUESTS: ${parsedQuery.guests || "any"}

SEARCH RESULTS:
${resultsText}

RULES:
- Only extract NAMED, SPECIFIC boats (not platforms or categories)
- Maximize diversity across different source URLs
- If a snippet mentions a specific boat name/model, extract it
- Be conservative with data you can't see — use null for unknown fields
- match_score should be lower (0.5-0.75) since snippet data is limited

Return ONLY a JSON array (max 8):
[{
  "name": "specific yacht name",
  "type": "motor|sailing|catamaran|superyacht|speedboat|gulet",
  "brand": null, "model": null, "year": null,
  "length_ft": null, "cabins": null, "guests": null, "crew": null,
  "price_per_week": null, "price_per_day": null, "sale_price": null,
  "currency": "EUR",
  "region": "region", "country": "country", "port": null,
  "features": [],
  "description": "from snippet",
  "source_url": "search result URL",
  "source_title": "title",
  "image_url": null,
  "luxury_level": 3,
  "match_score": 0.65,
  "match_reasons": ["reason"],
  "ai_summary": "why this matches"
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
