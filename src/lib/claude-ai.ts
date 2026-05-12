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
  const json = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());

  return {
    ...json,
    currency: json.currency || "EUR",
    keywords: json.keywords || [],
    raw,
  };
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
        content: `You are an AI yacht discovery engine. Analyze these search results and extract yacht/boat listings.

USER SEARCH: "${parsedQuery.raw}"
PARSED INTENT: ${parsedQuery.intent}
BUDGET: ${parsedQuery.budget_max ? `${parsedQuery.currency} ${parsedQuery.budget_max}` : "not specified"}
LOCATION: ${parsedQuery.country || parsedQuery.region || "not specified"}
TYPE: ${parsedQuery.boat_type || "any"}
GUESTS: ${parsedQuery.guests || "not specified"}
DATE: ${parsedQuery.date || "flexible"}

SEARCH RESULTS:
${resultsText}

Extract up to 8 yacht listings from these results. For each listing, estimate details from the snippet and title.
Return ONLY a valid JSON array of objects with this structure:
[{
  "name": "yacht name",
  "type": "motor|sailing|catamaran|superyacht|speedboat|gulet",
  "brand": "builder/brand or null",
  "model": "model or null",
  "year": 2024,
  "length_ft": 85,
  "cabins": 4,
  "guests": 10,
  "crew": 3,
  "price_per_week": 50000,
  "currency": "EUR",
  "region": "Mediterranean",
  "country": "Croatia",
  "port": "Split",
  "features": ["feature1", "feature2"],
  "description": "Brief description of the yacht and why it matches",
  "source_url": "the URL from search results",
  "source_title": "the title from search results",
  "luxury_level": 4,
  "match_score": 0.85,
  "match_reasons": ["Reason 1", "Reason 2"],
  "ai_summary": "2-3 sentence explanation why this yacht matches the user's request"
}]

Be realistic with estimates. If you can't determine a value, use reasonable defaults for the yacht type and region. Focus on the best matches for the user's query. Set match_score between 0.3-0.95 based on how well each result matches the query.`,
      },
    ],
  });

  const text =
    msg.content[0].type === "text" ? msg.content[0].text : "[]";

  try {
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}
