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

const MODEL = "claude-haiku-4-5-20251001";

export interface ParsedUserQuery {
  intent: "charter" | "buy" | "explore";
  region?: string;
  country?: string;
  city?: string;
  budget_max?: number;
  budget_per_day?: number;
  currency: string;
  boat_type?: string;
  guests?: number;
  date?: string;
  style?: string;
  keywords: string[];
  raw: string;
  corrected_query?: string;
  optimized_search_query?: string;
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
  const today = new Date().toISOString().split("T")[0];

  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `Parse this boat search query. Fix typos, understand DE/EN/FR/ES/IT. TODAY: ${today}

EXAMPLES:
"Boot chartern in Hamburg" → intent:charter, country:Germany, city:Hamburg, optimized_search_query:"boat charter Hamburg Germany rental yacht"
"Boot 300€ pro tag max übermorgen" → intent:charter, budget_per_day:300, date:${(() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().split("T")[0]; })()}, optimized_search_query:"boat charter rental €300 per day"
"segeln kroatien 4 pers" → intent:charter, country:Croatia, guests:4, boat_type:sailing, optimized_search_query:"sailing yacht charter Croatia 4 guests"
"yacht kaufen mittelmeer bis 500k" → intent:buy, region:Mediterranean, budget_max:500000, optimized_search_query:"yacht for sale Mediterranean under 500000 EUR"
"katamaran ibiza party" → intent:charter, boat_type:catamaran, country:Spain, city:Ibiza, style:party, optimized_search_query:"catamaran charter Ibiza party boat rental"
"location bateau corse 6 personnes" → intent:charter, country:France, guests:6, optimized_search_query:"boat rental Corsica France 6 guests charter"
"Houseboat Amsterdam" → intent:charter, boat_type:houseboat, country:Netherlands, city:Amsterdam, optimized_search_query:"houseboat rental Amsterdam Netherlands charter"

RULES:
- Boot=Boat in German (NOT a typo)
- "pro tag/per day" → budget_per_day | "pro woche/per week" → budget_max
- Relative dates: morgen=+1day, übermorgen=+2days, nächste Woche=next monday
- "chartern/mieten/rent/charter/location/alquiler" = charter intent
- "kaufen/buy/acheter" = buy intent
- city: extract specific city/port names (Hamburg, Ibiza, Amsterdam, Split, etc.)
- optimized_search_query: ALWAYS generate this. It's an English search query optimized for Google to find real boat charter/sale listings. Include: boat type, location, "charter"/"for sale"/"rental", guests if given. Make it specific and effective.

Parse: "${raw}"

JSON only:
{"intent":"charter|buy|explore","region":null,"country":null,"city":null,"budget_max":null,"budget_per_day":null,"currency":"EUR","boat_type":null,"guests":null,"date":null,"style":null,"keywords":[],"corrected_query":null,"optimized_search_query":""}`,
      },
    ],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  const json = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());

  const budgetPerDay = json.budget_per_day || undefined;
  const budgetMax = json.budget_max || (budgetPerDay ? budgetPerDay * 7 : undefined);

  return {
    ...json,
    budget_max: budgetMax,
    budget_per_day: budgetPerDay,
    currency: json.currency || "EUR",
    keywords: json.keywords || [],
    corrected_query: json.corrected_query || undefined,
    optimized_search_query: json.optimized_search_query || undefined,
    raw,
  };
}

export async function extractBoatsFromPages(
  pages: { url: string; title: string; content: string }[],
  parsedQuery: ParsedUserQuery
): Promise<ExtractedListing[]> {
  const pagesText = pages
    .map((p, i) => `[PAGE ${i + 1}] ${p.url}\n${p.title}\n${p.content.slice(0, 5000)}`)
    .join("\n---\n");

  const search = parsedQuery.corrected_query || parsedQuery.raw;
  const loc = parsedQuery.country || parsedQuery.region || "any";
  const budget = parsedQuery.budget_per_day
    ? `${parsedQuery.currency}${parsedQuery.budget_per_day}/day (${parsedQuery.currency}${parsedQuery.budget_max}/week)`
    : parsedQuery.budget_max ? `${parsedQuery.currency}${parsedQuery.budget_max}` : "any";

  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `Extract boats available for ${parsedQuery.intent === "buy" ? "PURCHASE" : "PRIVATE CHARTER/RENTAL"} from these pages.

Search: "${search}" | Location: ${loc} | Budget: ${budget} | Type: ${parsedQuery.boat_type || "any"} | Guests: ${parsedQuery.guests || "any"}

${pagesText}

QUALITY FILTER:
- REJECT: ferries, passenger ships, sailing schools, harbor cruises, sightseeing boats, water taxis
- INCLUDE: any boat/yacht you can rent, charter, or book privately — even if price is missing
- If a page lists multiple boats (e.g. a fleet page), extract EACH individual boat separately
- match_score: 0.85+ = perfect match, 0.7-0.84 = good, 0.5-0.69 = partial

RULES:
1. Extract AS MANY boats as possible. Max 20. The more the better.
2. source_url: Use DIRECT boat detail URL from [BOAT LINKS: ...]. NEVER use homepage/category URLs.
3. image_url: Match from [IMAGES: ...] to each boat.
4. Diversify across pages. Be exact with prices (per day/week/sale).
5. type: motor|sailing|catamaran|superyacht|speedboat|gulet
6. country/port: Use the ACTUAL location of the boat, not just the search location.

JSON array only:
[{"name":"","type":"","brand":null,"model":null,"year":null,"length_ft":null,"cabins":null,"guests":null,"crew":null,"price_per_week":null,"price_per_day":null,"sale_price":null,"currency":"EUR","region":"","country":"","port":null,"features":[],"description":"","source_url":"DIRECT BOAT URL","source_title":"","image_url":null,"luxury_level":3,"match_score":0.8,"match_reasons":[],"ai_summary":""}]`,
      },
    ],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "[]";
  try {
    return JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
  } catch {
    return [];
  }
}

export async function extractListingsFromSearchResults(
  searchResults: { title: string; link: string; snippet: string }[],
  parsedQuery: ParsedUserQuery
): Promise<ExtractedListing[]> {
  const resultsText = searchResults
    .map((r, i) => `[${i + 1}] ${r.title} | ${r.link} | ${r.snippet}`)
    .join("\n");

  const search = parsedQuery.corrected_query || parsedQuery.raw;

  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 5000,
    messages: [
      {
        role: "user",
        content: `Extract boats for ${parsedQuery.intent === "buy" ? "PURCHASE" : "CHARTER/RENTAL"} from search snippets.
Search: "${search}" | Location: ${parsedQuery.country || parsedQuery.region || "any"}

${resultsText}

Rules:
- Extract any boat/yacht available for ${parsedQuery.intent === "buy" ? "sale" : "charter or rental"}
- REJECT only: tours, sailing schools, ferries, sightseeing
- If a snippet mentions a platform with boats (e.g. "20+ boats available"), create a listing for that platform
- source_url = search result URL. Diversify across domains. Max 12.

JSON array only:
[{"name":"","type":"","brand":null,"model":null,"year":null,"length_ft":null,"cabins":null,"guests":null,"crew":null,"price_per_week":null,"price_per_day":null,"sale_price":null,"currency":"EUR","region":"","country":"","port":null,"features":[],"description":"","source_url":"","source_title":"","image_url":null,"luxury_level":3,"match_score":0.65,"match_reasons":[],"ai_summary":""}]`,
      },
    ],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "[]";
  try {
    return JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
  } catch {
    return [];
  }
}
