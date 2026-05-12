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
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `You parse casual, everyday boat search queries. Users type like they text — short, sloppy, any language.

TODAY IS: ${today}

EXAMPLES of real user input → how to parse:
- "Boot 300€ pro tag max übermorgen" → intent:charter, budget_per_day:300, date:${(() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().split("T")[0]; })()}, currency:EUR
- "segeln kroatien 4 pers nächste woche" → intent:charter, country:Croatia, guests:4, boat_type:sailing, date:next monday
- "yacht kaufen mittelmeer bis 500k" → intent:buy, region:Mediterranean, budget_max:500000
- "katamaran ibiza 10 leute party" → intent:charter, boat_type:catamaran, country:Spain, guests:10, style:party
- "günstig boot mieten mallorca" → intent:charter, country:Spain, style:budget
- "location bateau corse 6 personnes" → intent:charter, country:France, guests:6
- "motor yacht dubai weekend 20 guests" → intent:charter, country:UAE, guests:20, boat_type:motor
- "segelboot 2 wochen griechenland august" → intent:charter, boat_type:sailing, country:Greece, date:2025-08-01
- "Houseboat Amsterdam 4 Personen" → intent:charter, boat_type:houseboat, country:Netherlands, guests:4

RULES:
- Fix ALL typos (Boot→Boat is NOT a typo, Boot=Boat in German)
- "pro tag/per day/al giorno/par jour" → budget_per_day (NOT budget_max)
- "pro woche/per week/par semaine" → budget_max (= weekly budget)
- Relative dates: morgen/tomorrow=+1day, übermorgen=+2days, nächste Woche/next week=next monday, nächsten Monat=1st of next month
- "max/bis/under/unter/moins de" = budget limit
- "pers/personen/leute/pax/guests/personnes" = guests
- "kaufen/buy/acheter/comprar" = buy intent
- "mieten/chartern/rent/charter/location/alquiler/noleggio" = charter intent

Parse: "${raw}"

JSON only:
{"intent":"charter|buy|explore","region":null,"country":null,"budget_max":null,"budget_per_day":null,"currency":"EUR","boat_type":null,"guests":null,"date":null,"style":null,"keywords":[],"corrected_query":null}`,
      },
    ],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  const json = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());

  // Convert daily budget to weekly for search
  const budgetPerDay = json.budget_per_day || undefined;
  const budgetMax = json.budget_max || (budgetPerDay ? budgetPerDay * 7 : undefined);

  return {
    ...json,
    budget_max: budgetMax,
    budget_per_day: budgetPerDay,
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
        content: `You are a yacht comparison engine. Extract EVERY specific boat from these pages.

Search: "${search}" | Intent: ${parsedQuery.intent} | Location: ${loc} | Budget: ${budget} | Type: ${parsedQuery.boat_type || "any"} | Guests: ${parsedQuery.guests || "any"}

${pagesText}

CRITICAL RULES:
1. Extract ALL named boats you find. The more the better. Max 15.
2. source_url MUST be the DIRECT link to that specific boat's detail page. Look in [BOAT LINKS: ...] for the exact URL that matches each boat name. If the page URL contains the boat name/slug, use it. NEVER use the homepage or category page as source_url.
3. image_url: Look in [IMAGES: ...] and match images to boats. Pick the one most likely showing that boat.
4. Diversify across ALL pages — don't skip any page.
5. Be exact with prices. per day = price_per_day, per week = price_per_week, for sale = sale_price.
6. type must be one of: motor|sailing|catamaran|superyacht|speedboat|gulet

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
        content: `Extract specific named boats from search snippets. Search: "${search}" | Intent: ${parsedQuery.intent} | Location: ${parsedQuery.country || parsedQuery.region || "any"}

${resultsText}

Rules:
- Only boats where snippet mentions a SPECIFIC name or model
- source_url = the search result URL (these are usually detail pages already)
- Diversify across URLs. Max 8.

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
