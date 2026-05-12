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

// World's most comprehensive yacht/boat platform list
const PLATFORMS = [
  // Major international charter platforms
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
  // Luxury / superyacht
  "burgessyachts.com",
  "fraseryachts.com",
  "edmistoncompany.com",
  "oceanindependence.com",
  "worthavenueyachts.com",
  "denisonyachtsales.com",
  "northropandjohnson.com",
  "iyc.com",
  "superyachttimes.com",
  "bfraser.com",
  "yachtworld.com",
  "boat-hq.com",
  // Mediterranean specialists
  "yacht-charter-croatia.com",
  "mycroatiancharter.com",
  "croatialuxurygulet.com",
  "grecharter.com",
  "greekcharteryachts.com",
  "turkishgulet.com",
  "bodrum-yachtcharter.com",
  "sardiniayachtcharter.com",
  "amalfi-charter.com",
  "balearic-yacht-charter.com",
  // Caribbean & Americas
  "caribbeanyachtcharter.com",
  "bvicrewedyachts.com",
  "nicholsonyachts.com",
  "catamaran-charter.com",
  // German / DACH market
  "scansail.de",
  "master-yachting.de",
  "argos-yachtcharter.de",
  "yacht.de",
  "yachtico.com",
  "sunsail.de",
  "chartercheck.com",
  // French market
  "filovent.com",
  "oceans-evasion.com",
  // Sale platforms
  "boats.com",
  "boattrader.com",
  "yacht.de",
  "scanboat.com",
  "rightboat.com",
  "theyachtmarket.com",
  "apolloduck.com",
];

// Location-specific search terms per region
const REGION_TERMS: Record<string, string[]> = {
  croatia: ["Dalmatia", "Split", "Dubrovnik", "Zadar", "Hvar", "Kornati"],
  greece: ["Cyclades", "Ionian", "Dodecanese", "Saronic", "Sporades", "Athens", "Mykonos", "Santorini"],
  turkey: ["Bodrum", "Gocek", "Fethiye", "Marmaris", "Antalya"],
  italy: ["Sardinia", "Sicily", "Amalfi", "Naples", "Portofino", "Cinque Terre"],
  spain: ["Mallorca", "Ibiza", "Menorca", "Barcelona", "Costa Brava"],
  france: ["Cote d'Azur", "Corsica", "Nice", "Cannes", "Saint-Tropez"],
  caribbean: ["BVI", "USVI", "St Martin", "Antigua", "Bahamas", "Grenada"],
  usa: ["Miami", "Fort Lauderdale", "Key West", "San Diego", "Newport", "Hamptons"],
  thailand: ["Phuket", "Koh Samui", "Krabi", "Phang Nga"],
  uae: ["Dubai", "Abu Dhabi"],
  montenegro: ["Kotor", "Tivat", "Budva"],
  monaco: ["Monaco", "Monte Carlo"],
};

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
  const type = parsed.boat_type || "yacht";
  const budget = parsed.budget_max
    ? `under ${parsed.currency || "€"}${parsed.budget_max.toLocaleString("en-US")}`
    : "";
  const guests = parsed.guests ? `${parsed.guests} guests` : "";
  const intentEN = parsed.intent === "buy" ? "for sale" : "charter";
  const intentDE = parsed.intent === "buy" ? "kaufen" : "mieten chartern";
  const intentFR = parsed.intent === "buy" ? "à vendre" : "location";
  const year = "2025 2026";

  // 1: Raw query — best intent signal
  queries.push(parsed.raw);

  // 2: English structured (most important)
  queries.push(
    `${type} ${intentEN} ${location} ${budget} ${guests} price per week ${year}`.trim()
  );

  // 3: Specific boat listing query
  queries.push(
    `"${type}" "${location}" ${intentEN} ${guests} cabins price -blog -news -article -magazine`.trim()
  );

  // 4: German structured
  queries.push(
    `${type} ${intentDE} ${location} ${budget} ${guests} Preis pro Woche ${year}`.trim()
  );

  // 5: French structured (for Med destinations)
  if (["france", "corsica", "monaco"].some(k => location.toLowerCase().includes(k))) {
    queries.push(
      `${type} ${intentFR} ${location} ${budget} ${guests} prix par semaine`.trim()
    );
  }

  // 6-8: Platform groups (3 groups of ~20 each for max coverage)
  const chunkSize = Math.ceil(PLATFORMS.length / 3);
  for (let i = 0; i < 3; i++) {
    const group = PLATFORMS.slice(i * chunkSize, (i + 1) * chunkSize)
      .slice(0, 8) // max 8 per OR group for Google
      .map((p) => `site:${p}`)
      .join(" OR ");
    queries.push(`(${group}) ${type} ${location} ${guests} ${intentEN}`.trim());
  }

  // 9: Region-specific sub-locations
  const countryKey = location.toLowerCase().replace(/\s+/g, "");
  const regionTerms = REGION_TERMS[countryKey];
  if (regionTerms) {
    const subLocations = regionTerms.slice(0, 4).join(" OR ");
    queries.push(
      `${type} ${intentEN} (${subLocations}) ${budget} ${guests}`.trim()
    );
  }

  // 10: Comparison / review query (finds aggregator pages with multiple boats)
  queries.push(
    `best ${type} ${intentEN} ${location} ${year} comparison review top 10`.trim()
  );

  // 11: Style-specific
  if (parsed.style) {
    queries.push(`${parsed.style} ${type} ${intentEN} ${location} ${guests} ${budget}`.trim());
  }

  // 12: Budget-focused
  if (parsed.budget_max) {
    queries.push(
      `affordable ${type} ${intentEN} ${location} ${budget} ${guests} best value`.trim()
    );
  }

  // 13: Direct booking query
  queries.push(
    `${type} ${location} ${intentEN} direct booking availability ${guests} ${year}`.trim()
  );

  // 14: Catamaran/specific type if mentioned
  if (parsed.boat_type && parsed.boat_type !== "yacht") {
    queries.push(
      `${parsed.boat_type} ${intentEN} ${location} ${guests} ${budget} available ${year}`.trim()
    );
  }

  return queries.filter((q) => q.length > 10).slice(0, 12);
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
        title: r.title,
        imageUrl: r.imageUrl,
        link: r.link,
      })
    );
  } catch {
    return [];
  }
}

export interface PageData {
  url: string;
  title: string;
  content: string;
  images: string[];
}

export async function fetchPageContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9,de;q=0.8,fr;q=0.7",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) return "";

    const html = await res.text();

    // Extract image URLs before stripping HTML
    const imgUrls: string[] = [];
    const imgRegex = /<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)['"]/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null && imgUrls.length < 10) {
      const src = match[1];
      if (src.startsWith("http") && !src.includes("icon") && !src.includes("logo") && !src.includes("sprite")) {
        imgUrls.push(src);
      }
    }

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
      .replace(/&pound;/g, "£")
      .replace(/&dollar;/g, "$")
      .replace(/&#\d+;/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Append image URLs at the end so AI can find them
    const imageSection = imgUrls.length > 0
      ? `\n[IMAGES FOUND ON PAGE: ${imgUrls.join(" | ")}]`
      : "";

    return text.slice(0, 12000) + imageSection;
  } catch {
    return "";
  }
}
