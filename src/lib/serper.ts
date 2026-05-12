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
      snippet: r.snippet ?? "",
      position: i + 1,
    })
  );

  return organic;
}

const PLATFORMS = [
  "yachtcharterfleet.com",
  "getmyboat.com",
  "click-boat.com",
  "samboat.com",
  "boatbookings.com",
  "charterworld.com",
  "boatsetter.com",
  "nautal.com",
  "zizoo.com",
  "sailo.com",
  "moorings.com",
  "dreamyachtcharter.com",
  "charterindex.com",
  "12knots.com",
  "happycharter.com",
  "boatburner.com",
  "scansail.de",
  "master-yachting.de",
  "argos-yachtcharter.de",
  "yacht.de",
];

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
  const type = parsed.boat_type || "boat";
  const budget = parsed.budget_max
    ? `under ${parsed.currency || "€"}${parsed.budget_max.toLocaleString("en-US")}`
    : "";
  const guests = parsed.guests ? `${parsed.guests} guests` : "";
  const intentEN = parsed.intent === "buy" ? "for sale" : "charter";
  const intentDE = parsed.intent === "buy" ? "kaufen" : "mieten";

  // 1: User's raw query directly — best intent signal
  queries.push(parsed.raw);

  // 2: English structured query
  queries.push(
    `${type} ${intentEN} ${location} ${budget} ${guests} price per week 2025 2026`.trim()
  );

  // 3: German structured query
  queries.push(
    `${type} ${intentDE} ${location} ${budget} ${guests} Preis pro Woche`.trim()
  );

  // 4: Major international platforms
  const platformGroup1 = PLATFORMS.slice(0, 5).map((p) => `site:${p}`).join(" OR ");
  queries.push(`(${platformGroup1}) ${type} ${location} ${guests}`.trim());

  // 5: More platforms
  const platformGroup2 = PLATFORMS.slice(5, 10).map((p) => `site:${p}`).join(" OR ");
  queries.push(`(${platformGroup2}) ${type} ${location} ${guests}`.trim());

  // 6: German/local platforms
  const platformGroup3 = PLATFORMS.slice(10).map((p) => `site:${p}`).join(" OR ");
  queries.push(`(${platformGroup3}) ${type} ${location} ${guests}`.trim());

  // 7: Specific listing pages
  queries.push(
    `"${location}" "${type}" charter rent hire ${budget} cabins -blog -news -article`.trim()
  );

  // 8: Alternative terms
  queries.push(
    `boat rental ${location} ${guests} ${type} weekly rate available`.trim()
  );

  // 9: Style-specific if provided
  if (parsed.style) {
    queries.push(`${parsed.style} ${type} ${intentEN} ${location} ${guests}`.trim());
  }

  // 10: Budget-focused if budget given
  if (parsed.budget_max) {
    queries.push(
      `cheap affordable ${type} ${intentEN} ${location} ${budget} ${guests}`.trim()
    );
  }

  return queries.filter((q) => q.length > 10).slice(0, 10);
}

export async function fetchPageContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
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
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&euro;/g, "€")
      .replace(/&#\d+;/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return text.slice(0, 10000);
  } catch {
    return "";
  }
}
