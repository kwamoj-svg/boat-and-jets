import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Parse this yacht/boat search query into structured JSON. Extract all information you can find.

Query: "${raw}"

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
  "keywords": ["array", "of", "keywords"]
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

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are a yacht discovery AI. You are given the text content of yacht listing pages.
Your job: find SPECIFIC, INDIVIDUAL boats/yachts mentioned on these pages.

USER SEARCH: "${parsedQuery.raw}"
INTENT: ${parsedQuery.intent}
BUDGET: ${parsedQuery.budget_max ? `${parsedQuery.currency} ${parsedQuery.budget_max}` : "not specified"}
LOCATION: ${parsedQuery.country || parsedQuery.region || "not specified"}
TYPE: ${parsedQuery.boat_type || "any"}
GUESTS: ${parsedQuery.guests || "not specified"}
DATE: ${parsedQuery.date || "flexible"}

PAGE CONTENTS:
${pagesText}

RULES:
- Extract REAL boat names found in the page text (e.g. "M/Y SERENITY", "Lagoon 52", "Azimut Grande 35")
- Each result must be a SPECIFIC yacht, not a platform or category
- The source_url should be the page URL where you found the boat. If the page mentions a specific link to the boat detail page, use that instead.
- Only include boats that somewhat match the user's search criteria
- Be accurate with prices, specs, and names — only use data you actually found in the text
- If a price is listed per day, convert to approximate weekly (x7)

Return ONLY a valid JSON array (max 8 boats):
[{
  "name": "actual yacht name from page",
  "type": "motor|sailing|catamaran|superyacht|speedboat|gulet",
  "brand": "builder if mentioned",
  "model": "model if mentioned",
  "year": 2024,
  "length_ft": 85,
  "cabins": 4,
  "guests": 10,
  "crew": 3,
  "price_per_week": 50000,
  "currency": "EUR",
  "region": "Mediterranean",
  "country": "USA",
  "port": "Miami",
  "features": ["Jacuzzi", "Jet ski"],
  "description": "Brief factual description from the page",
  "source_url": "URL where this specific boat was found",
  "source_title": "page title",
  "luxury_level": 4,
  "match_score": 0.85,
  "match_reasons": ["Budget match", "Location match"],
  "ai_summary": "Why this specific boat matches the user's request"
}]

If you cannot find any specific boats, return an empty array [].`,
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

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are a yacht discovery AI. Analyze these search results and extract specific yacht listings.
Focus on finding INDIVIDUAL, NAMED yachts — not platforms or generic categories.

USER SEARCH: "${parsedQuery.raw}"
INTENT: ${parsedQuery.intent}
BUDGET: ${parsedQuery.budget_max ? `${parsedQuery.currency} ${parsedQuery.budget_max}` : "not specified"}
LOCATION: ${parsedQuery.country || parsedQuery.region || "not specified"}
TYPE: ${parsedQuery.boat_type || "any"}
GUESTS: ${parsedQuery.guests || "not specified"}

SEARCH RESULTS:
${resultsText}

Extract up to 4 specific yacht listings visible in these snippets.
Return ONLY a valid JSON array:
[{
  "name": "specific yacht name",
  "type": "motor|sailing|catamaran|superyacht|speedboat|gulet",
  "brand": "builder or null",
  "model": "model or null",
  "year": 2024,
  "length_ft": 85,
  "cabins": 4,
  "guests": 10,
  "crew": 3,
  "price_per_week": 50000,
  "currency": "EUR",
  "region": "region",
  "country": "country",
  "port": "port",
  "features": [],
  "description": "brief description",
  "source_url": "URL from search results",
  "source_title": "title",
  "luxury_level": 4,
  "match_score": 0.75,
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
