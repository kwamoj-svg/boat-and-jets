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
  const base = parsed.intent === "buy" ? "for sale" : "charter";
  const location = parsed.country || parsed.region || "";
  const type = parsed.boat_type || "yacht";
  const budget = parsed.budget_max
    ? `under ${parsed.currency || "€"}${parsed.budget_max.toLocaleString("en-US")}`
    : "";
  const guests = parsed.guests ? `${parsed.guests} guests` : "";

  // Query 1: Specific boat listings on major platforms
  queries.push(
    `site:yachtcharterfleet.com OR site:charterworld.com OR site:boatbookings.com ${type} ${base} ${location} ${budget}`.trim()
  );

  // Query 2: Individual yacht detail pages
  queries.push(
    `"${type}" "${base}" "${location}" "per week" ${budget} ${guests} -blog -guide -article`.trim()
  );

  // Query 3: Direct listing search
  queries.push(
    `${type} ${base} ${location} ${budget} cabins guests crew price week 2026`.trim()
  );

  return queries;
}

export async function fetchPageContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BoatAndJets/1.0; +https://boat-and-jets.onrender.com)",
        Accept: "text/html",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) return "";

    const html = await res.text();

    // Strip HTML tags, keep text content — lightweight extraction
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&euro;/g, "€")
      .replace(/\s+/g, " ")
      .trim();

    // Return first 6000 chars to stay within token limits
    return text.slice(0, 6000);
  } catch {
    return "";
  }
}
