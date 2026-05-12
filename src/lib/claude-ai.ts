import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY || process.env.BOAT_ANTHROPIC_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
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

/** Fallback parser when AI is unavailable — extracts basics from raw text */
function fallbackParse(raw: string): ParsedUserQuery {
  const lower = raw.toLowerCase();

  // Detect boat type
  let boat_type: string | undefined;
  if (/motor|speed|rib/i.test(lower)) boat_type = "motor";
  else if (/segel|sail/i.test(lower)) boat_type = "sailing";
  else if (/katamaran|catamaran/i.test(lower)) boat_type = "catamaran";
  else if (/yacht/i.test(lower)) boat_type = "motor";
  else if (/hausboot|houseboat/i.test(lower)) boat_type = "houseboat";

  // Detect intent
  let intent: "charter" | "buy" | "explore" = "charter";
  if (/kauf|buy|acheter|comprar/i.test(lower)) intent = "buy";

  // Detect budget
  let budget_per_day: number | undefined;
  let budget_max: number | undefined;
  const budgetMatch = lower.match(/(\d+)\s*€?\s*(pro\s*tag|per\s*day|\/tag|\/day)/);
  if (budgetMatch) budget_per_day = Number(budgetMatch[1]);
  const weekMatch = lower.match(/(\d+)\s*€?\s*(pro\s*woche|per\s*week|\/woche|\/week)/);
  if (weekMatch) budget_max = Number(weekMatch[1]);
  if (budget_per_day && !budget_max) budget_max = budget_per_day * 7;

  // Detect guests
  let guests: number | undefined;
  const guestMatch = lower.match(/(\d+)\s*(pers|gäste|guests|personen|people|pax)/);
  if (guestMatch) guests = Number(guestMatch[1]);

  // Detect location — check known destinations
  const LOCATIONS: Record<string, { country: string; city?: string; region?: string }> = {
    mallorca: { country: "Spain", city: "Mallorca", region: "Mediterranean" },
    ibiza: { country: "Spain", city: "Ibiza", region: "Mediterranean" },
    kroatien: { country: "Croatia", region: "Mediterranean" },
    croatia: { country: "Croatia", region: "Mediterranean" },
    griechenland: { country: "Greece", region: "Mediterranean" },
    greece: { country: "Greece", region: "Mediterranean" },
    italien: { country: "Italy", region: "Mediterranean" },
    italy: { country: "Italy", region: "Mediterranean" },
    sardinien: { country: "Italy", city: "Sardinia", region: "Mediterranean" },
    sardinia: { country: "Italy", city: "Sardinia", region: "Mediterranean" },
    spanien: { country: "Spain", region: "Mediterranean" },
    spain: { country: "Spain", region: "Mediterranean" },
    frankreich: { country: "France", region: "Mediterranean" },
    france: { country: "France", region: "Mediterranean" },
    türkei: { country: "Turkey", region: "Mediterranean" },
    tuerkei: { country: "Turkey", region: "Mediterranean" },
    turkey: { country: "Turkey", region: "Mediterranean" },
    split: { country: "Croatia", city: "Split", region: "Mediterranean" },
    dubrovnik: { country: "Croatia", city: "Dubrovnik", region: "Mediterranean" },
    athen: { country: "Greece", city: "Athens", region: "Mediterranean" },
    athens: { country: "Greece", city: "Athens", region: "Mediterranean" },
    barcelona: { country: "Spain", city: "Barcelona", region: "Mediterranean" },
    hamburg: { country: "Germany", city: "Hamburg" },
    amsterdam: { country: "Netherlands", city: "Amsterdam" },
    nizza: { country: "France", city: "Nice", region: "Mediterranean" },
    nice: { country: "France", city: "Nice", region: "Mediterranean" },
    korsika: { country: "France", city: "Corsica", region: "Mediterranean" },
    corsica: { country: "France", city: "Corsica", region: "Mediterranean" },
    bodrum: { country: "Turkey", city: "Bodrum", region: "Mediterranean" },
    amalfi: { country: "Italy", city: "Amalfi", region: "Mediterranean" },
    montenegro: { country: "Montenegro", region: "Mediterranean" },
    malta: { country: "Malta", region: "Mediterranean" },
  };

  let country: string | undefined;
  let city: string | undefined;
  let region: string | undefined;
  for (const [key, loc] of Object.entries(LOCATIONS)) {
    if (lower.includes(key)) {
      country = loc.country;
      city = loc.city || city;
      region = loc.region;
      break;
    }
  }

  // Build search query
  const parts = [boat_type || "boat", city || country || "", intent === "buy" ? "for sale" : "charter rental"].filter(Boolean);

  return {
    intent,
    region,
    country,
    city,
    budget_max: budget_max,
    budget_per_day: budget_per_day,
    currency: "EUR",
    boat_type,
    guests,
    date: undefined,
    style: undefined,
    keywords: raw.split(/\s+/).filter(w => w.length > 2),
    raw,
    corrected_query: raw,
    optimized_search_query: parts.join(" "),
  };
}

export async function parseUserQuery(raw: string): Promise<ParsedUserQuery> {
  const today = new Date().toISOString().split("T")[0];

  try {
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
  } catch (err) {
    console.error("[AI] parseUserQuery failed, using fallback parser:", err);
    return fallbackParse(raw);
  }
}

export async function extractBoatsFromPages(
  pages: { url: string; title: string; content: string }[],
  parsedQuery: ParsedUserQuery
): Promise<ExtractedListing[]> {
  try {
  const pagesText = pages
    .map((p, i) => `[PAGE ${i + 1}] ${p.url}\n${p.title}\n${p.content.slice(0, 5000)}`)
    .join("\n---\n");

  const search = parsedQuery.corrected_query || parsedQuery.raw;
  const loc = parsedQuery.country || parsedQuery.region || "any";
  const budget = parsedQuery.budget_per_day
    ? `MAX ${parsedQuery.currency}${parsedQuery.budget_per_day}/day`
    : parsedQuery.budget_max ? `MAX ${parsedQuery.currency}${parsedQuery.budget_max}/week` : "any";

  const msg = await getClient().messages.create({
    model: MODEL,
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `Extract INDIVIDUAL boats for ${parsedQuery.intent === "buy" ? "PURCHASE" : "PRIVATE CHARTER/RENTAL"}.

Search: "${search}" | Location: ${loc} | Budget: ${budget} | Type: ${parsedQuery.boat_type || "any"} | Guests: ${parsedQuery.guests || "any"}

${pagesText}

STRICT RULES:
1. Each entry = ONE SPECIFIC BOAT with a real name (e.g. "Bavaria 46 Cruiser", "Beneteau Oceanis 38", "Lagoon 42").
2. NEVER create entries like "Fleet", "Platform", "Collection", "Multiple boats", "Various". These are FORBIDDEN.
3. NEVER use a platform name as the boat name (e.g. "Nautal Ibiza" or "Samboat Fleet" are WRONG).
4. If a page is a listing page with multiple boats, extract each INDIVIDUAL boat by name.
5. If you can't find individual boat names, skip that page entirely.
${parsedQuery.budget_per_day ? `6. BUDGET FILTER: ONLY include boats at or below ${parsedQuery.currency}${parsedQuery.budget_per_day}/day. Skip expensive boats!` : ""}
${parsedQuery.budget_max ? `6. BUDGET FILTER: ONLY include boats at or below ${parsedQuery.currency}${parsedQuery.budget_max}/week. Skip expensive boats!` : ""}

REJECT: ferries, passenger ships, sailing schools, harbor cruises, sightseeing, water taxis, fleet/platform entries
INCLUDE: individual boats you can rent/charter/book privately

source_url: Use URLs from [BOAT DETAIL LINKS: ...]. If none match, use the page URL.
type: motor|sailing|catamaran|superyacht|speedboat|gulet

JSON array only — each item is ONE boat:
[{"name":"SPECIFIC BOAT NAME","type":"","brand":null,"model":null,"year":null,"length_ft":null,"cabins":null,"guests":null,"crew":null,"price_per_week":null,"price_per_day":null,"sale_price":null,"currency":"EUR","region":"","country":"","port":null,"features":[],"description":"","source_url":"","source_title":"","image_url":null,"luxury_level":3,"match_score":0.8,"match_reasons":[],"ai_summary":""}]`,
      },
    ],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "[]";
  try {
    return JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
  } catch {
    return [];
  }
  } catch (err) {
    console.error("[AI] extractBoatsFromPages failed:", err);
    return [];
  }
}

export async function extractListingsFromSearchResults(
  searchResults: { title: string; link: string; snippet: string }[],
  parsedQuery: ParsedUserQuery
): Promise<ExtractedListing[]> {
  try {
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
        content: `Extract INDIVIDUAL boats for ${parsedQuery.intent === "buy" ? "PURCHASE" : "CHARTER/RENTAL"} from search snippets.
Search: "${search}" | Location: ${parsedQuery.country || parsedQuery.region || "any"}

${resultsText}

STRICT RULES:
1. Each entry = ONE SPECIFIC BOAT with a real name (model name like "Bavaria 46", "Lagoon 42", etc.)
2. NEVER create "Fleet", "Platform", "Collection" entries. FORBIDDEN.
3. NEVER use website/platform names as boat names ("Nautal Ibiza" = WRONG, "Samboat Fleet" = WRONG)
4. If a snippet only describes a platform (e.g. "20+ boats available in..."), SKIP it entirely.
5. Only extract if the snippet mentions a SPECIFIC boat name/model.
${parsedQuery.budget_per_day ? `6. BUDGET: Only boats at or under ${parsedQuery.currency}${parsedQuery.budget_per_day}/day.` : ""}
Max 10. Diversify across domains.

JSON array only:
[{"name":"SPECIFIC BOAT NAME","type":"","brand":null,"model":null,"year":null,"length_ft":null,"cabins":null,"guests":null,"crew":null,"price_per_week":null,"price_per_day":null,"sale_price":null,"currency":"EUR","region":"","country":"","port":null,"features":[],"description":"","source_url":"","source_title":"","image_url":null,"luxury_level":3,"match_score":0.65,"match_reasons":[],"ai_summary":""}]`,
      },
    ],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "[]";
  try {
    return JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
  } catch {
    return [];
  }
  } catch (err) {
    console.error("[AI] extractListingsFromSearchResults failed:", err);
    return [];
  }
}
