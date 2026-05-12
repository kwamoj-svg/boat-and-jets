import { NextRequest } from "next/server";
import { searchWeb, buildSearchQueries, fetchPageContent, searchImages, extractDetailLinksFromHtml } from "@/lib/serper";
import {
  parseUserQuery,
  extractBoatsFromPages,
  extractListingsFromSearchResults,
} from "@/lib/claude-ai";
import type { ExtractedListing } from "@/lib/claude-ai";
import { resolveLocation, marinasToSearchContext } from "@/lib/google-places";
import { semanticRank } from "@/lib/embeddings";
import { scrapeAllPlatforms } from "@/lib/platform-scrapers";
import {
  getCachedSearch,
  cacheSearchResults,
  saveBoats,
  findCachedBoats,
  bulkFindDetailUrls,
} from "@/lib/database";
import { upgradeAllUrls } from "@/lib/platform-urls";

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
        // Stage 0: Check search cache (instant results!)
        const cached = await getCachedSearch(q);
        if (cached && cached.length > 0) {
          send("stage", { stage: "cached", message: "Ergebnisse aus Cache geladen" });
          send("parsed", {}); // placeholder
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

        // Stage 1: Parse query
        send("stage", { stage: "parsing", message: "Understanding your search..." });
        const parsed = await parseUserQuery(q);
        send("parsed", parsed);

        // Stage 1.5: Location + Search + Platform scrapers ALL IN PARALLEL
        send("stage", { stage: "searching", message: "Searching 50+ platforms worldwide..." });

        const locationQuery = [parsed.city, parsed.country, parsed.region].filter(Boolean).join(" ");
        const queries = buildSearchQueries(parsed);
        const imageQuery = [
          parsed.boat_type || "yacht",
          parsed.country || parsed.region || "",
          parsed.intent === "buy" ? "for sale" : "charter",
        ].filter(Boolean).join(" ");

        // Run EVERYTHING in parallel — allSettled so one failure doesn't kill the rest
        const settled = await Promise.allSettled([
          locationQuery ? resolveLocation(locationQuery) : Promise.resolve(null),
          Promise.allSettled(queries.map((query) => searchWeb(query, 10))),
          searchImages(imageQuery, 20).catch(() => []),
          scrapeAllPlatforms(locationQuery, parsed.boat_type),
          findCachedBoats({
            country: parsed.country || undefined,
            region: parsed.region || undefined,
            city: parsed.city || undefined,
            boatType: parsed.boat_type || undefined,
            guests: parsed.guests || undefined,
            budgetPerDay: parsed.budget_per_day || undefined,
            currency: parsed.currency,
          }).catch(() => []),
        ]);

        const locationInfo = settled[0].status === "fulfilled" ? settled[0].value : null;
        const searchSettled = settled[1].status === "fulfilled"
          ? (settled[1].value as PromiseSettledResult<{ title: string; link: string; snippet: string }[]>[])
              .filter((r): r is PromiseFulfilledResult<{ title: string; link: string; snippet: string }[]> => r.status === "fulfilled")
              .map(r => r.value)
          : [];
        const allResults = searchSettled;
        const imageResults = settled[2].status === "fulfilled" ? (settled[2].value as { title: string; imageUrl: string; link: string }[]) : [];
        const platformListings = settled[3].status === "fulfilled" ? settled[3].value as ExtractedListing[] : [];
        const dbBoats = settled[4].status === "fulfilled" ? settled[4].value as ExtractedListing[] : [];

        if (locationInfo) {
          send("location", {
            address: locationInfo.formatted_address,
            lat: locationInfo.lat,
            lng: locationInfo.lng,
            marinas: locationInfo.marinas.slice(0, 5),
          });
        }

        // Dedupe by URL
        const seen = new Set<string>();
        const uniqueResults = allResults.flat().filter((r) => {
          if (seen.has(r.link)) return false;
          seen.add(r.link);
          return true;
        });

        const platformCount = new Set(uniqueResults.map(r => getDomain(r.link))).size + (platformListings.length > 0 ? 4 : 0);
        send("stage", {
          stage: "fetching",
          message: `Found ${uniqueResults.length + platformListings.length} results from ${platformCount} platforms...`,
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

        // Stage 3: Fetch 20 pages — single fetch, extract content + detail links
        const topPages = diverseResults.slice(0, 20);
        const detailLinksByDomain = new Map<string, string[]>();

        const pageContents = await Promise.all(
          topPages.map(async (r) => {
            try {
              // Single HTTP fetch
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

              // Process content (reuse raw HTML, no second fetch)
              const content = await fetchPageContent(r.link, html);
              return { url: r.link, title: r.title, content };
            } catch {
              return { url: r.link, title: r.title, content: "" };
            }
          })
        );

        const pagesWithContent = pageContents.filter((p) => p.content.length > 200);

        send("stage", {
          stage: "analyzing",
          message: `AI analyzing ${pagesWithContent.length} pages + ${platformListings.length} direct listings...`,
        });

        // Stage 4: Extract — pages + snippets in parallel (2 AI calls total)
        const [pageListings, snippetListings] = await Promise.all([
          pagesWithContent.length > 0
            ? extractBoatsFromPages(pagesWithContent, parsed)
            : Promise.resolve([]),
          extractListingsFromSearchResults(uniqueResults.slice(0, 40), parsed),
        ]);

        // Stage 5: Merge + dedupe (DB boats → platform scrapers → AI extractions)
        const allListings: ExtractedListing[] = [];
        const existingNames = new Set<string>();

        // DB boats first (have verified detail URLs!)
        for (const listing of dbBoats) {
          const key = listing.name?.toLowerCase().trim();
          if (key && key.length > 2 && !existingNames.has(key)) {
            allListings.push(listing);
            existingNames.add(key);
          }
        }

        // Platform scrapers second (direct data)
        for (const listing of platformListings) {
          const key = listing.name?.toLowerCase().trim();
          if (key && key.length > 2 && !existingNames.has(key)) {
            allListings.push(listing);
            existingNames.add(key);
          }
        }

        // Then AI-extracted listings
        for (const listing of [...pageListings, ...snippetListings]) {
          const key = listing.name?.toLowerCase().trim();
          if (key && !existingNames.has(key)) {
            allListings.push(listing);
            existingNames.add(key);
          }
        }

        // ── HARD POST-PROCESSING FILTERS ──
        // These run AFTER AI extraction to guarantee clean results.
        // AI prompts help but can't be trusted 100%.

        const BANNED_NAME_WORDS = [
          "fleet", "platform", "collection", "multiple", "various",
          "diverse", "selection", "listing", "listings", "overview",
          "angebote", "flotte", "auswahl",
        ];
        const KNOWN_PLATFORMS = [
          "nautal", "samboat", "click-boat", "clickboat", "boataround",
          "getmyboat", "zizoo", "sailo", "12knots", "charterworld",
          "boatbookings", "moorings", "dreamyacht", "yachtcharterfleet",
          "master yachting", "scansail", "sunsail", "tubber", "happycharter",
          "argos nautika", "yacht pool", "filovent", "globe sailor",
          "globesailor", "incrediblue", "borrowaboat",
        ];

        // Filter in-place
        for (let i = allListings.length - 1; i >= 0; i--) {
          const l = allListings[i];
          const nameLower = (l.name || "").toLowerCase().trim();

          // 1) Remove fleet/platform/collection entries
          if (BANNED_NAME_WORDS.some(w => nameLower.includes(w))) {
            allListings.splice(i, 1);
            continue;
          }

          // 2) Remove entries where name is just a platform name
          if (KNOWN_PLATFORMS.some(p => {
            const cleaned = nameLower.replace(/[^a-z0-9\s]/g, "").trim();
            return cleaned === p || cleaned.startsWith(p + " ") ||
                   cleaned.endsWith(" " + p) ||
                   // "Nautal Ibiza" or "Samboat Fleet" patterns
                   (cleaned.split(/\s+/).length <= 3 && cleaned.includes(p));
          })) {
            allListings.splice(i, 1);
            continue;
          }

          // 3) Remove entries with very short/generic names (< 3 chars or just numbers)
          if (nameLower.length < 3 || /^\d+$/.test(nameLower)) {
            allListings.splice(i, 1);
            continue;
          }

          // 4) Budget enforcement — hard filter
          if (parsed.budget_per_day && l.price_per_day) {
            // Allow 30% tolerance (€300 budget → allow up to €390)
            if (l.price_per_day > parsed.budget_per_day * 1.3) {
              allListings.splice(i, 1);
              continue;
            }
          }
          if (parsed.budget_max && l.price_per_week) {
            if (l.price_per_week > parsed.budget_max * 1.3) {
              allListings.splice(i, 1);
              continue;
            }
          }
        }

        // Attach images — track used images so each boat gets a unique one
        const usedImageUrls = new Set<string>();

        for (const listing of allListings) {
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

        // ── URL UPGRADER: Replace category URLs with real boat detail pages ──
        for (const l of allListings) {
          // Normalize prices
          if (l.price_per_day && !l.price_per_week) {
            l.price_per_week = l.price_per_day * 7;
          }

          const domain = getDomain(l.source_url);
          let path: string;
          try { path = new URL(l.source_url).pathname; } catch { continue; }
          const segments = path.split("/").filter(Boolean);

          // Check if URL looks like a category/homepage
          const isCategory =
            /^\/(en|de|fr|es|it)?\/?$/.test(path) ||
            /\/(search|results|fleet|boats?-list|yacht-charter|boat-rental|browse)\/?$/i.test(path) ||
            segments.length <= 1 ||
            // Generic category paths ending in location name
            /\/(yacht-charter|boat-rental|charter|boats|search)\//i.test(path) && segments.length <= 3 && !/\d/.test(segments[segments.length - 1]);

          if (isCategory) {
            // Try to find a matching detail link from the same domain
            const domainLinks = detailLinksByDomain.get(domain) || [];
            if (domainLinks.length > 0) {
              const nameParts = (l.name || "").toLowerCase()
                .replace(/[^a-z0-9\s]/g, "")
                .split(/\s+/)
                .filter(w => w.length > 2);
              const brandModel = `${l.brand || ""} ${l.model || ""}`.toLowerCase().trim();

              // Strategy 1: Match boat name words in URL
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
              } else if (domainLinks.length > 0) {
                // Strategy 2: Use first available detail link from same domain (better than category)
                const unusedLink = domainLinks.find(link =>
                  !allListings.some(other => other !== l && other.source_url === link)
                );
                if (unusedLink) {
                  l.source_url = unusedLink;
                }
              }
            }

            // Re-check: if still category URL, penalize
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

        // Stage 5.4: DB URL upgrade — check if we know better URLs from past searches
        const dbUrls = await bulkFindDetailUrls(allListings);
        for (const l of allListings) {
          const betterUrl = dbUrls.get(l.name);
          if (betterUrl && betterUrl !== l.source_url) {
            // Only upgrade if current URL looks like a category page
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

        // Stage 5.5: Semantic re-ranking with OpenAI embeddings
        const searchText = parsed.optimized_search_query || parsed.corrected_query || q;
        const ranked = await semanticRank(searchText, allListings);
        const rankedListings = ranked.length > 0 ? ranked : allListings;

        // Sort + diversify (max 25 per domain to allow 100+ results)
        rankedListings.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));

        const sourceCounts = new Map<string, number>();
        const finalListings = rankedListings.filter((l) => {
          const domain = getDomain(l.source_url);
          const count = sourceCounts.get(domain) || 0;
          if (count >= 25) return false;
          sourceCounts.set(domain, count + 1);
          return true;
        }).slice(0, 120);

        // Final URL upgrade: replace remaining category URLs with smart platform search URLs
        upgradeAllUrls(finalListings, {
          location: locationQuery,
          country: parsed.country || undefined,
          city: parsed.city || undefined,
          guests: parsed.guests || undefined,
          dateFrom: parsed.date || undefined,
          boatType: parsed.boat_type || undefined,
        });

        // Stream results
        const finalPlatforms = new Set(finalListings.map(l => getDomain(l.source_url))).size;
        send("stage", { stage: "results", message: `${finalListings.length} boats from ${finalPlatforms} platforms` });

        for (const listing of finalListings) {
          send("listing", listing);
        }

        send("done", {
          total_found: rankedListings.length,
          displayed: finalListings.length,
          platforms_searched: platformCount,
          pages_analyzed: pagesWithContent.length,
          search_id: crypto.randomUUID(),
          db_boats: dbBoats.length,
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
