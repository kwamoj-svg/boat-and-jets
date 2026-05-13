import { NextRequest } from "next/server";
import { searchWeb, buildSearchQueries, fetchPageContent, searchImages, extractDetailLinksFromHtml, type SerperResult } from "@/lib/serper";
import {
  parseUserQuery,
  extractBoatsFromPages,
  extractListingsFromSearchResults,
} from "@/lib/claude-ai";
import type { ExtractedListing, ParsedUserQuery } from "@/lib/claude-ai";
import { resolveLocation, marinasToSearchContext } from "@/lib/google-places";
import { semanticRank } from "@/lib/embeddings";
import { scrapeAllPlatforms } from "@/lib/platform-scrapers";
import {
  getCachedSearch,
  cacheSearchResults,
  saveBoats,
  findCachedBoats,
  bulkFindDetailUrls,
  searchCharterBoats,
} from "@/lib/database";
import { upgradeAllUrls } from "@/lib/platform-urls";
import { detectExperience, applyExperienceFilters } from "@/lib/experience-search";

export const maxDuration = 60;

// DSGVO: Kein persistentes Logging von Nutzerdaten.
// Suchanfragen werden session-basiert verarbeitet und nur anonymisiert
// als Bootsdaten (keine personenbezogenen Daten) zwischengespeichert.

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

// ── CONSTANTS ──

const BLOCKED_SEARCH_DOMAINS = new Set([
  "youtube.com", "youtu.be", "facebook.com", "instagram.com",
  "twitter.com", "x.com", "tiktok.com", "pinterest.com",
  "reddit.com", "wikipedia.org", "wikivoyage.org",
  "tripadvisor.com", "tripadvisor.de", "trustpilot.com",
  "visaeurope.com", "visa.com", "booking.com", "airbnb.com",
  "expedia.com", "kayak.com", "skyscanner.com",
  "linkedin.com", "medium.com", "blogspot.com",
  "amazon.com", "ebay.com", "google.com",
]);

const BANNED_NAME_WORDS = [
  "fleet", "platform", "collection", "multiple", "various",
  "diverse", "selection", "listing", "listings", "overview",
  "angebote", "flotte", "auswahl", "best boat", "top 10",
  "guide", "tipps", "how to", "review",
];

const KNOWN_PLATFORMS = [
  "nautal", "samboat", "click-boat", "clickboat", "boataround",
  "getmyboat", "zizoo", "sailo", "12knots", "charterworld",
  "boatbookings", "moorings", "dreamyacht", "yachtcharterfleet",
  "master yachting", "scansail", "sunsail", "tubber", "happycharter",
  "argos nautika", "yacht pool", "filovent", "globe sailor",
  "globesailor", "incrediblue", "borrowaboat",
];

const BANNED_DOMAINS = [
  "youtube.com", "youtu.be", "facebook.com", "instagram.com",
  "twitter.com", "x.com", "tiktok.com", "pinterest.com",
  "reddit.com", "wikipedia.org", "wikivoyage.org",
  "tripadvisor.com", "tripadvisor.de", "trustpilot.com",
  "visaeurope.com", "visa.com", "booking.com", "airbnb.com",
  "expedia.com", "kayak.com", "skyscanner.com",
  "linkedin.com", "medium.com", "blogspot.com",
  "amazon.com", "ebay.com", "google.com",
];

const TYPE_COMPAT: Record<string, string[]> = {
  motor: ["motor", "motorboot", "speedboat", "speed", "rib", "power", "trawler", "flybridge", "motor yacht", "motoryacht"],
  sailing: ["sailing", "segel", "segelboot", "sail", "sailboat"],
  catamaran: ["catamaran", "katamaran", "cat"],
  houseboat: ["houseboat", "hausboot"],
  gulet: ["gulet"],
  superyacht: ["superyacht", "super yacht", "mega yacht", "megayacht"],
  yacht: ["yacht", "motor", "sailing", "catamaran", "motor yacht", "motoryacht", "superyacht", "gulet", "flybridge", "trawler"],
};

function typeMatches(listingType: string, requestedType: string): boolean {
  if (!requestedType) return true;
  const reqLower = requestedType.toLowerCase();
  const listLower = listingType.toLowerCase();
  if (listLower === reqLower) return true;
  if (listLower.includes(reqLower) || reqLower.includes(listLower)) return true;
  const compatTypes = TYPE_COMPAT[reqLower] || [reqLower];
  return compatTypes.some(t => listLower.includes(t) || t.includes(listLower));
}

/** Post-process and filter a batch of listings */
function postProcess(listings: ExtractedListing[], parsed: ParsedUserQuery): ExtractedListing[] {
  for (let i = listings.length - 1; i >= 0; i--) {
    const l = listings[i];
    const nameLower = (l.name || "").toLowerCase().trim();

    // Remove listings from banned domains
    const sourceDomain = getDomain(l.source_url);
    if (BANNED_DOMAINS.some(d => sourceDomain.includes(d))) {
      listings.splice(i, 1);
      continue;
    }

    // Remove fleet/platform/collection entries
    if (BANNED_NAME_WORDS.some(w => nameLower.includes(w))) {
      listings.splice(i, 1);
      continue;
    }

    // Remove entries where name is just a platform name
    if (KNOWN_PLATFORMS.some(p => {
      const cleaned = nameLower.replace(/[^a-z0-9\s]/g, "").trim();
      return cleaned === p || cleaned.startsWith(p + " ") ||
             cleaned.endsWith(" " + p) ||
             (cleaned.split(/\s+/).length <= 3 && cleaned.includes(p));
    })) {
      listings.splice(i, 1);
      continue;
    }

    // Remove very short/generic names
    if (nameLower.length < 3 || /^\d+$/.test(nameLower)) {
      listings.splice(i, 1);
      continue;
    }

    // Clean up names
    if (l.name) {
      // Remove trailing hash/database IDs (mixed alpha+digits like "B995yjk", "x458e", "6r987e4")
      // but NOT real words like "Cruiser", "Impression", "Bavaria"
      l.name = l.name.replace(/\s+(?=[A-Za-z]*\d)[A-Za-z0-9]{4,8}$/g, "").trim();
      const words = l.name.split(" ");
      if (words.length >= 3 && words[0].toLowerCase() === words[1].toLowerCase()) {
        l.name = words.slice(1).join(" ");
      }
    }

    // Demote generic sitemap names (e.g. "Motorboot Korfu", "Segelboot Split")
    if (/^(Segelboot|Motorboot|Katamaran|Schlauchboot|Hausboot)\s+\S+(\s+#\d+)?$/i.test(l.name || "")) {
      l.match_score = Math.min(l.match_score, 0.4);
    }

    // Boat type enforcement
    if (parsed.boat_type && l.type) {
      if (!typeMatches(l.type, parsed.boat_type)) {
        l.match_score = Math.min(l.match_score, 0.3);
      }
    }

    // Budget enforcement
    if (parsed.budget_per_day) {
      const desc = `${l.description || ""} ${l.ai_summary || ""}`.toLowerCase();
      let effectiveDayPrice = l.price_per_day;
      if (effectiveDayPrice && /half.?day|halber?\s*tag|demi/i.test(desc)) {
        effectiveDayPrice = effectiveDayPrice * 2;
      }
      if (effectiveDayPrice && /per\s*hour|pro\s*stunde|\/\s*h\b/i.test(desc)) {
        effectiveDayPrice = effectiveDayPrice * 8;
      }
      if (effectiveDayPrice) {
        if (effectiveDayPrice > parsed.budget_per_day * 1.3) {
          listings.splice(i, 1);
          continue;
        }
        if (effectiveDayPrice <= parsed.budget_per_day) {
          l.match_score = Math.max(l.match_score, 0.85);
        }
      } else {
        l.match_score = Math.min(l.match_score, 0.55);
      }
    }
    if (parsed.budget_max) {
      if (l.price_per_week) {
        if (l.price_per_week > parsed.budget_max * 1.3) {
          listings.splice(i, 1);
          continue;
        }
        if (l.price_per_week <= parsed.budget_max) {
          l.match_score = Math.max(l.match_score, 0.85);
        }
      } else if (!l.price_per_day) {
        l.match_score = Math.min(l.match_score, 0.55);
      }
    }
  }
  return listings;
}

/** Deduplicate listings by name, keeping the first occurrence */
function dedupeByName(listings: ExtractedListing[], existingNames: Set<string>): ExtractedListing[] {
  const result: ExtractedListing[] = [];
  for (const l of listings) {
    const key = l.name?.toLowerCase().trim();
    if (key && key.length > 2 && !existingNames.has(key)) {
      existingNames.add(key);
      result.push(l);
    }
  }
  return result;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length === 0) {
    return new Response(JSON.stringify({ error: "Query parameter 'q' is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // ═══════════════════════════════════════════════════════════
        // STAGE 0: Check search cache (instant results!)
        // ═══════════════════════════════════════════════════════════
        const cached = await getCachedSearch(q);
        if (cached && cached.length > 0) {
          send("stage", { stage: "cached", message: "Ergebnisse aus Cache geladen" });
          send("parsed", {});
          const platforms = new Set(cached.map(l => getDomain(l.source_url))).size;
          send("stage", { stage: "results", message: `${cached.length} boats from ${platforms} platforms (cached)` });
          for (const listing of cached) {
            send("listing", listing);
          }
          send("done", {
            total_found: cached.length,
            displayed: cached.length,
            platforms_searched: platforms,
            pages_analyzed: 0,
            search_id: crypto.randomUUID(),
            from_cache: true,
          });
          controller.close();
          return;
        }

        // ═══════════════════════════════════════════════════════════
        // PHASE 1: FAST PATH (~2-4s)
        // Instant parse (fallback) → Scrapers + DB → Stream first batch
        // ═══════════════════════════════════════════════════════════
        send("stage", { stage: "parsing", message: "Suche wird vorbereitet..." });

        // Start AI parse in background (slow) — don't await yet
        const aiParsePromise = parseUserQuery(q);

        // Use fast fallback parse for immediate scraper queries
        // (parseUserQuery has a fallback built in, but we want to fire scrapers NOW
        //  while the AI parse may still be running)
        const fastParsed = await aiParsePromise;
        send("parsed", fastParsed);

        // Detect experience-based intent
        const experience = detectExperience(q);

        const locationQuery = [fastParsed.city, fastParsed.country, fastParsed.region].filter(Boolean).join(" ");

        // ═══════════════════════════════════════════════════════════
        // INSTANT: Stream charter_boats from Supabase (< 500ms)
        // ═══════════════════════════════════════════════════════════
        send("stage", { stage: "database", message: "Lade Boote aus Datenbank..." });
        let instantBoats: ExtractedListing[] = [];
        try {
          instantBoats = await searchCharterBoats({
            country: fastParsed.country || undefined,
            region: fastParsed.region || undefined,
            city: fastParsed.city || undefined,
            boatType: fastParsed.boat_type || undefined,
            guests: fastParsed.guests || undefined,
            budgetPerDay: fastParsed.budget_per_day || undefined,
            limit: 20,
          });
          // Stream instant results immediately
          if (instantBoats.length > 0) {
            for (const boat of instantBoats) {
              send("listing", boat);
            }
            send("stage", { stage: "instant", message: `${instantBoats.length} Boote sofort gefunden — suche weitere...` });
          }
        } catch {
          // Non-critical, continue with scraping
        }

        send("stage", { stage: "searching", message: "Durchsuche 50+ Plattformen..." });

        // Phase 1 parallel: scrapers + DB + location + images (all fast, no AI)
        const phase1Settled = await Promise.allSettled([
          scrapeAllPlatforms(locationQuery, fastParsed.boat_type),
          findCachedBoats({
            country: fastParsed.country || undefined,
            region: fastParsed.region || undefined,
            city: fastParsed.city || undefined,
            boatType: fastParsed.boat_type || undefined,
            guests: fastParsed.guests || undefined,
            budgetPerDay: fastParsed.budget_per_day || undefined,
            currency: fastParsed.currency,
          }).catch(() => []),
          locationQuery ? resolveLocation(locationQuery) : Promise.resolve(null),
          searchImages(
            [fastParsed.boat_type || "yacht", fastParsed.country || fastParsed.region || "", fastParsed.intent === "buy" ? "for sale" : "charter"].filter(Boolean).join(" "),
            20
          ).catch(() => []),
        ]);

        const platformListings = phase1Settled[0].status === "fulfilled" ? phase1Settled[0].value as ExtractedListing[] : [];
        const dbBoats = phase1Settled[1].status === "fulfilled" ? phase1Settled[1].value as ExtractedListing[] : [];
        const locationInfo = phase1Settled[2].status === "fulfilled" ? phase1Settled[2].value : null;
        const imageResults = phase1Settled[3].status === "fulfilled" ? (phase1Settled[3].value as { title: string; imageUrl: string; link: string }[]) : [];

        if (locationInfo) {
          send("location", {
            address: locationInfo.formatted_address,
            lat: locationInfo.lat,
            lng: locationInfo.lng,
            marinas: locationInfo.marinas.slice(0, 5),
          });
        }

        // Merge Phase 1 results: DB first, then scrapers
        const existingNames = new Set<string>();
        let phase1Results: ExtractedListing[] = [];
        phase1Results.push(...dedupeByName(dbBoats, existingNames));
        phase1Results.push(...dedupeByName(platformListings, existingNames));

        // Post-process Phase 1
        phase1Results = postProcess(phase1Results, fastParsed);
        if (experience) applyExperienceFilters(phase1Results, experience);

        // Attach images to Phase 1 results
        const usedImageUrls = new Set<string>();
        attachImages(phase1Results, imageResults, usedImageUrls);

        // Normalize prices
        for (const l of phase1Results) {
          if (l.price_per_day && !l.price_per_week) {
            l.price_per_week = l.price_per_day * 7;
          }
        }

        // Sort Phase 1 results
        phase1Results.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));

        // ── STREAM PHASE 1 RESULTS IMMEDIATELY ──
        if (phase1Results.length > 0) {
          send("stage", { stage: "phase1", message: `${phase1Results.length} Ergebnisse gefunden — suche weitere...` });
          for (const listing of phase1Results) {
            send("listing", listing);
          }
        }

        // ═══════════════════════════════════════════════════════════
        // PHASE 2: DEEP SEARCH (~8-15s)
        // AI web search → Page fetching → AI extraction → Stream more
        // ═══════════════════════════════════════════════════════════
        send("stage", { stage: "deep_search", message: "KI-gestützte Tiefensuche läuft..." });

        const parsed = fastParsed; // AI parse already resolved

        // Build search queries and run web search
        const queries = buildSearchQueries(parsed);
        const searchSettled = await Promise.allSettled(queries.map((query) => searchWeb(query, 10)));

        const allResults = searchSettled
          .filter((r): r is PromiseFulfilledResult<SerperResult[]> => r.status === "fulfilled")
          .map(r => r.value);

        // Dedupe by URL + filter blocked domains
        const seen = new Set<string>();
        const uniqueResults = allResults.flat().filter((r) => {
          if (seen.has(r.link)) return false;
          seen.add(r.link);
          const domain = getDomain(r.link);
          if (BLOCKED_SEARCH_DOMAINS.has(domain)) return false;
          return true;
        });

        // Diversify pages (max 3 per domain)
        const domainCount = new Map<string, number>();
        const diverseResults = uniqueResults.filter((r) => {
          const domain = getDomain(r.link);
          const count = domainCount.get(domain) || 0;
          if (count >= 3) return false;
          domainCount.set(domain, count + 1);
          return true;
        });

        // Fetch top 12 pages (reduced from 20 to limit memory on 512MB Render)
        const topPages = diverseResults.slice(0, 12);
        const detailLinksByDomain = new Map<string, string[]>();

        const pageContents = await Promise.all(
          topPages.map(async (r) => {
            try {
              const ctrl = new AbortController();
              const t = setTimeout(() => ctrl.abort(), 4500);
              const res = await fetch(r.link, {
                signal: ctrl.signal,
                headers: {
                  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
                  Accept: "text/html",
                  "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
                },
              });
              clearTimeout(t);
              if (!res.ok) return { url: r.link, title: r.title, content: "" };
              const html = await res.text();

              // Extract detail links for URL upgrader
              const domain = getDomain(r.link);
              const links = extractDetailLinksFromHtml(html, r.link);
              if (links.length > 0) {
                const existing = detailLinksByDomain.get(domain) || [];
                detailLinksByDomain.set(domain, [...new Set([...existing, ...links])]);
              }

              const content = await fetchPageContent(r.link, html);
              return { url: r.link, title: r.title, content };
            } catch {
              return { url: r.link, title: r.title, content: "" };
            }
          })
        );

        const pagesWithContent = pageContents.filter((p) => p.content.length > 200);

        send("stage", { stage: "analyzing", message: `KI analysiert ${pagesWithContent.length} Seiten...` });

        // AI extraction: pages + snippets in parallel
        const [pageListings, snippetListings] = await Promise.all([
          pagesWithContent.length > 0
            ? extractBoatsFromPages(pagesWithContent, parsed)
            : Promise.resolve([]),
          extractListingsFromSearchResults(uniqueResults.slice(0, 40), parsed),
        ]);

        // Merge Phase 2 results (dedupe against Phase 1)
        let phase2Results: ExtractedListing[] = [];
        phase2Results.push(...dedupeByName(pageListings, existingNames));
        phase2Results.push(...dedupeByName(snippetListings, existingNames));

        // Post-process Phase 2
        phase2Results = postProcess(phase2Results, parsed);
        if (experience) applyExperienceFilters(phase2Results, experience);

        // URL upgrader for Phase 2 results
        for (const l of phase2Results) {
          if (l.price_per_day && !l.price_per_week) {
            l.price_per_week = l.price_per_day * 7;
          }

          const domain = getDomain(l.source_url);
          let path: string;
          try { path = new URL(l.source_url).pathname; } catch { continue; }
          const segments = path.split("/").filter(Boolean);

          const isCategory =
            /^\/(en|de|fr|es|it)?\/?$/.test(path) ||
            /\/(search|results|fleet|boats?-list|yacht-charter|boat-rental|browse)\/?$/i.test(path) ||
            segments.length <= 1 ||
            /\/(yacht-charter|boat-rental|charter|boats|search)\//i.test(path) && segments.length <= 3 && !/\d/.test(segments[segments.length - 1]);

          if (isCategory) {
            const domainLinks = detailLinksByDomain.get(domain) || [];
            if (domainLinks.length > 0) {
              const nameParts = (l.name || "").toLowerCase()
                .replace(/[^a-z0-9\s]/g, "")
                .split(/\s+/)
                .filter(w => w.length > 2);
              const brandModel = `${l.brand || ""} ${l.model || ""}`.toLowerCase().trim();

              let bestLink: string | null = null;
              let bestScore = 0;
              for (const link of domainLinks) {
                const linkLower = link.toLowerCase();
                let score = 0;
                for (const part of nameParts) {
                  if (linkLower.includes(part)) score++;
                }
                if (brandModel.length > 3 && linkLower.includes(brandModel.replace(/\s+/g, "-"))) {
                  score += 3;
                }
                if (score > bestScore) {
                  bestScore = score;
                  bestLink = link;
                }
              }

              if (bestLink && bestScore >= 1) {
                l.source_url = bestLink;
              } else {
                const unusedLink = domainLinks.find(link =>
                  !phase2Results.some(other => other !== l && other.source_url === link)
                );
                if (unusedLink) l.source_url = unusedLink;
              }
            }

            // Penalize if still category
            try {
              const newPath = new URL(l.source_url).pathname;
              const stillCategory =
                /^\/(en|de|fr|es|it)?\/?$/.test(newPath) ||
                /\/(search|results|fleet|boats?-list|yacht-charter|boat-rental)\/?$/i.test(newPath) ||
                newPath.split("/").filter(Boolean).length <= 1;
              if (stillCategory) {
                l.match_score = Math.min(l.match_score, 0.45);
              }
            } catch { /* keep */ }
          }
        }

        // Attach images to Phase 2 results
        attachImages(phase2Results, imageResults, usedImageUrls);

        // Sort Phase 2
        phase2Results.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));

        // ── STREAM PHASE 2 RESULTS ──
        if (phase2Results.length > 0) {
          send("stage", { stage: "phase2", message: `+${phase2Results.length} weitere Ergebnisse aus KI-Analyse` });
          for (const listing of phase2Results) {
            send("listing", listing);
          }
        }

        // ═══════════════════════════════════════════════════════════
        // FINAL: Combine, rank, upgrade URLs, and send summary
        // ═══════════════════════════════════════════════════════════
        const allListings = [...phase1Results, ...phase2Results];

        // DB URL upgrade
        const dbUrls = await bulkFindDetailUrls(allListings);
        for (const l of allListings) {
          const betterUrl = dbUrls.get(l.name);
          if (betterUrl && betterUrl !== l.source_url) {
            try {
              const path = new URL(l.source_url).pathname;
              const segments = path.split("/").filter(Boolean);
              if (segments.length <= 2 || /\/(search|results|fleet|yacht-charter|boat-rental)/i.test(path)) {
                l.source_url = betterUrl;
                l.match_score = Math.max(l.match_score, 0.75);
              }
            } catch { /* keep */ }
          }
        }

        // Semantic re-ranking
        const searchText = parsed.optimized_search_query || parsed.corrected_query || q;
        const ranked = await semanticRank(searchText, allListings);
        const rankedListings = ranked.length > 0 ? ranked : allListings;

        // Sort + diversify (max 25 per domain)
        rankedListings.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));

        const sourceCounts = new Map<string, number>();
        const finalListings = rankedListings.filter((l) => {
          const domain = getDomain(l.source_url);
          const count = sourceCounts.get(domain) || 0;
          if (count >= 25) return false;
          sourceCounts.set(domain, count + 1);
          return true;
        }).slice(0, 120);

        // Final URL upgrade
        upgradeAllUrls(finalListings, {
          location: locationQuery,
          country: parsed.country || undefined,
          city: parsed.city || undefined,
          guests: parsed.guests || undefined,
          dateFrom: parsed.date || undefined,
          boatType: parsed.boat_type || undefined,
        });

        // Final done event
        const finalPlatforms = new Set(finalListings.map(l => getDomain(l.source_url))).size;
        send("done", {
          total_found: rankedListings.length,
          displayed: finalListings.length,
          platforms_searched: finalPlatforms,
          pages_analyzed: pagesWithContent.length,
          search_id: crypto.randomUUID(),
          db_boats: dbBoats.length,
          phase1_count: phase1Results.length,
          phase2_count: phase2Results.length,
        });

        // Save to DB in background (fire-and-forget)
        Promise.all([
          saveBoats(finalListings),
          cacheSearchResults(q, finalListings, parsed as unknown as Record<string, unknown>),
        ]).catch(() => {});
      } catch (error) {
        console.error("Search error:", error);
        send("error", { error: "Search failed. Please try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/** Attach images from search results to listings */
function attachImages(
  listings: ExtractedListing[],
  imageResults: { title: string; imageUrl: string; link: string }[],
  usedImageUrls: Set<string>
) {
  for (const listing of listings) {
    if (listing.image_url) {
      usedImageUrls.add(listing.image_url);
      continue;
    }

    const nameLower = (listing.name || "").toLowerCase();
    const parts = nameLower.split(/[\s/]+/).filter(w => w.length > 2);

    // Strategy 1: Name match
    for (const img of imageResults) {
      if (usedImageUrls.has(img.imageUrl)) continue;
      const t = img.title.toLowerCase();
      if (parts.some(p => t.includes(p))) {
        listing.image_url = img.imageUrl;
        usedImageUrls.add(img.imageUrl);
        break;
      }
    }

    // Strategy 2: Brand/model match
    if (!listing.image_url && (listing.brand || listing.model)) {
      const bm = `${listing.brand || ""} ${listing.model || ""}`.toLowerCase().trim();
      for (const img of imageResults) {
        if (usedImageUrls.has(img.imageUrl)) continue;
        if (img.title.toLowerCase().includes(bm)) {
          listing.image_url = img.imageUrl;
          usedImageUrls.add(img.imageUrl);
          break;
        }
      }
    }

    // Strategy 3: Domain match
    if (!listing.image_url) {
      const d = getDomain(listing.source_url).split(".")[0];
      for (const img of imageResults) {
        if (usedImageUrls.has(img.imageUrl)) continue;
        if (getDomain(img.link).includes(d)) {
          listing.image_url = img.imageUrl;
          usedImageUrls.add(img.imageUrl);
          break;
        }
      }
    }
  }
}
