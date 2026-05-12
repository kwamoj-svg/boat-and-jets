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

  if (!res.ok) return [];

  const data = await res.json();
  return (data.organic ?? []).map(
    (r: { title: string; link: string; snippet: string }, i: number) => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet ?? "",
      position: i + 1,
    })
  );
}

const PLATFORMS = [
  // International charter
  "yachtcharterfleet.com", "getmyboat.com", "click-boat.com", "samboat.com",
  "boatbookings.com", "charterworld.com", "boatsetter.com", "nautal.com",
  "zizoo.com", "sailo.com", "moorings.com", "dreamyachtcharter.com",
  "charterindex.com", "12knots.com", "happycharter.com",
  // Luxury
  "burgessyachts.com", "fraseryachts.com", "edmistoncompany.com",
  "oceanindependence.com", "northropandjohnson.com", "iyc.com",
  // Mediterranean
  "yacht-charter-croatia.com", "mycroatiancharter.com", "croatialuxurygulet.com",
  "grecharter.com", "turkishgulet.com", "sardiniayachtcharter.com",
  // Caribbean
  "caribbeanyachtcharter.com", "nicholsonyachts.com",
  // DACH
  "scansail.de", "master-yachting.de", "argos-yachtcharter.de", "yachtico.com",
  // Sale
  "yachtworld.com", "boats.com", "boattrader.com", "rightboat.com", "theyachtmarket.com",
  // French
  "filovent.com",
];

export function buildSearchQueries(parsed: {
  intent: string;
  region?: string;
  country?: string;
  city?: string;
  boat_type?: string;
  budget_max?: number;
  budget_per_day?: number;
  currency?: string;
  guests?: number;
  date?: string;
  style?: string;
  keywords?: string[];
  raw: string;
  optimized_search_query?: string;
}): string[] {
  const queries: string[] = [];
  const loc = [parsed.city, parsed.country, parsed.region].filter(Boolean).join(" ");
  const type = parsed.boat_type || "yacht";
  const cur = parsed.currency || "€";
  const budget = parsed.budget_per_day
    ? `under ${cur}${parsed.budget_per_day} per day`
    : parsed.budget_max ? `under ${cur}${parsed.budget_max}` : "";
  const guests = parsed.guests ? `${parsed.guests} guests` : "";
  const intent = parsed.intent === "buy" ? "for sale" : "charter rental";

  // 1: AI-optimized query (best quality)
  if (parsed.optimized_search_query) {
    queries.push(parsed.optimized_search_query);
  }

  // 2: Structured EN with location emphasis
  queries.push(`${type} ${intent} ${loc} ${budget} ${guests} book online`.trim());

  // 3: Platform-specific with location
  queries.push(`${type} ${loc} ${intent} price per day week -tour -excursion -school -ferry`.trim());

  // 4: German query
  const intentDE = parsed.intent === "buy" ? "kaufen" : "chartern mieten";
  queries.push(`${type} ${intentDE} ${loc} ${budget} ${guests} buchen`.trim());

  // 5-7: Platform groups (3 groups)
  for (let i = 0; i < 3; i++) {
    const group = PLATFORMS.slice(i * 12, (i + 1) * 12)
      .slice(0, 8)
      .map(p => `site:${p}`)
      .join(" OR ");
    queries.push(`(${group}) ${type} ${loc} ${intent}`.trim());
  }

  // 8: Specific rental platforms + location
  queries.push(`"${loc}" ${type} ${intent} ${guests} ${budget} book`.trim());

  // 9: Style if given
  if (parsed.style) {
    queries.push(`${parsed.style} ${type} ${intent} ${loc} ${guests}`.trim());
  }

  // 10: Budget or comparison
  if (parsed.budget_max) {
    queries.push(`affordable ${type} ${intent} ${loc} ${budget} ${guests}`.trim());
  } else {
    queries.push(`best ${type} ${intent} ${loc} ${guests} top rated`.trim());
  }

  return queries.filter(q => q.length > 10).slice(0, 10);
}

export interface SerperImageResult {
  title: string;
  imageUrl: string;
  link: string;
}

export async function searchImages(query: string, num = 10): Promise<SerperImageResult[]> {
  try {
    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.images ?? []).map(
      (r: { title: string; imageUrl: string; link: string }) => ({
        title: r.title, imageUrl: r.imageUrl, link: r.link,
      })
    );
  } catch {
    return [];
  }
}

export async function fetchPageContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const baseUrl = new URL(url).origin;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return "";

    const html = await res.text();

    // Extract boat detail links (href containing boat/yacht/charter keywords)
    const links: string[] = [];
    const linkRe = /<a[^>]+href=["']([^"'#]+)['"]/gi;
    let lm;
    while ((lm = linkRe.exec(html)) !== null && links.length < 15) {
      let href = lm[1];
      if (href.startsWith("/")) href = baseUrl + href;
      if (href.startsWith("http") &&
          !href.includes("login") && !href.includes("register") && !href.includes("cookie") &&
          (href.includes("boat") || href.includes("yacht") || href.includes("charter") ||
           href.includes("catamaran") || href.includes("rental") || href.includes("alquiler") ||
           href.includes("gulet") || href.includes("sailing") || href.includes("propiedad"))) {
        links.push(href);
      }
    }

    // Extract images
    const imgs: string[] = [];
    const imgRe = /<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)['"]/gi;
    let m;
    while ((m = imgRe.exec(html)) !== null && imgs.length < 8) {
      let src = m[1];
      if (src.startsWith("/")) src = baseUrl + src;
      if (src.startsWith("http") && !src.includes("icon") && !src.includes("logo") && !src.includes("sprite") && src.length > 30) {
        imgs.push(src);
      }
    }

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&euro;/g, "€")
      .replace(/&#\d+;/g, "").replace(/\s+/g, " ").trim();

    const extras: string[] = [];
    if (links.length > 0) extras.push(`[BOAT LINKS: ${links.join(" | ")}]`);
    if (imgs.length > 0) extras.push(`[IMAGES: ${imgs.join(" | ")}]`);

    return text.slice(0, 6000) + (extras.length > 0 ? "\n" + extras.join("\n") : "");
  } catch {
    return "";
  }
}
