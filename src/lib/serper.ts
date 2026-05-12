export interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export async function searchWeb(query: string, num = 10): Promise<SerperResult[]> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.SERPER_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num }),
  });

  if (!res.ok) {
    throw new Error(`Serper API error: ${res.status}`);
  }

  const data = await res.json();
  const organic: SerperResult[] = (data.organic ?? []).map(
    (r: { title: string; link: string; snippet: string }, i: number) => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet,
      position: i + 1,
    })
  );

  return organic;
}

export function buildSearchQueries(parsed: {
  intent: string;
  region?: string;
  country?: string;
  boat_type?: string;
  budget_max?: number;
  currency?: string;
  guests?: number;
  date?: string;
  style?: string;
}): string[] {
  const queries: string[] = [];
  const base = parsed.intent === "buy" ? "yacht for sale" : "yacht charter";
  const location = parsed.country || parsed.region || "";
  const type = parsed.boat_type || "yacht";
  const budget = parsed.budget_max
    ? `under ${parsed.currency || "€"}${parsed.budget_max.toLocaleString("en-US")}`
    : "";
  const guests = parsed.guests ? `${parsed.guests} guests` : "";
  const date = parsed.date || "2026";

  queries.push(`${base} ${type} ${location} ${budget} ${date} price per week`.trim());

  if (location) {
    queries.push(`best ${type} ${base} ${location} ${guests} ${date}`.trim());
  }

  queries.push(`${location} ${base} listings ${type} ${budget} crewed`.trim());

  return queries;
}
