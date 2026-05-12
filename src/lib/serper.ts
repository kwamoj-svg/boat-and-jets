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
  keywords?: string[];
  raw: string;
}): string[] {
  const queries: string[] = [];
  const location = parsed.country || parsed.region || "";
  const type = parsed.boat_type || "";
  const budget = parsed.budget_max
    ? `under ${parsed.currency || "€"}${parsed.budget_max.toLocaleString("en-US")}`
    : "";
  const guests = parsed.guests ? `${parsed.guests} guests` : "";
  const intentWord = parsed.intent === "buy" ? "for sale" : "charter";

  // Q1: Direct specific listing search on major platforms
  queries.push(
    `${type} ${intentWord} ${location} ${budget} ${guests} price per week 2026`.trim()
  );

  // Q2: Platform-specific search
  queries.push(
    `site:yachtcharterfleet.com OR site:getmyboat.com OR site:boatbookings.com OR site:click-boat.com ${type} ${intentWord} ${location} ${guests}`.trim()
  );

  // Q3: Broader search with boat rental terms
  queries.push(
    `boat rental ${location} ${type} ${guests} ${budget} weekly`.trim()
  );

  // Q4: Local language / natural phrasing (pass through user's raw query)
  queries.push(`${parsed.raw} Preis pro Woche Mieten`);

  // Q5: Alternative platforms and smaller charters
  queries.push(
    `${location} ${type || "boat"} hire ${intentWord} ${guests} cabins crew price`.trim()
  );

  // Q6: Specific yacht names / models search
  if (type) {
    queries.push(
      `"${type}" ${intentWord} ${location} ${budget} specifications cabins`.trim()
    );
  }

  return queries.filter((q) => q.length > 10);
}

export async function fetchPageContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Boat/1.0; +https://boat-and-jets.onrender.com)",
        Accept: "text/html",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) return "";

    const html = await res.text();

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

    return text.slice(0, 8000);
  } catch {
    return "";
  }
}
