import { NextRequest } from "next/server";
import { searchWeb, buildSearchQueries, fetchPageContent, searchImages } from "@/lib/serper";
import {
  parseUserQuery,
  extractBoatsFromPages,
  extractListingsFromSearchResults,
} from "@/lib/claude-ai";
import type { ExtractedListing } from "@/lib/claude-ai";
import { resolveLocation, marinasToSearchContext } from "@/lib/google-places";
import { semanticRank } from "@/lib/embeddings";
import { scrapeAllPlatforms } from "@/lib/platform-scrapers";

export const maxDuration = 45;

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

        // Run EVERYTHING in parallel: location, search, images, direct platform scrapers
        const [locationInfo, allResults, imageResults, platformListings] = await Promise.all([
          locationQuery ? resolveLocation(locationQuery) : Promise.resolve(null),
          Promise.all(queries.map((query) => searchWeb(query, 10))),
          searchImages(imageQuery, 20),
          scrapeAllPlatforms(locationQuery, parsed.boat_type),
        ]);

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

        // Diversify pages (max 2 per domain)
        const domainCount = new Map<string, number>();
        const diverseResults = uniqueResults.filter((r) => {
          const domain = getDomain(r.link);
          const count = domainCount.get(domain) || 0;
          if (count >= 2) return false;
          domainCount.set(domain, count + 1);
          return true;
        });

        // Stage 3: Fetch 15 pages in parallel (faster timeout)
        const topPages = diverseResults.slice(0, 15);
        const pageContents = await Promise.all(
          topPages.map(async (r) => {
            const content = await fetchPageContent(r.link);
            return { url: r.link, title: r.title, content };
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
          extractListingsFromSearchResults(uniqueResults.slice(0, 25), parsed),
        ]);

        // Stage 5: Merge + dedupe (platform scrapers + AI extractions)
        const allListings: ExtractedListing[] = [];
        const existingNames = new Set<string>();

        // Platform scrapers first (highest quality — direct data)
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

        // Normalize prices
        for (const l of allListings) {
          if (l.price_per_day && !l.price_per_week) {
            l.price_per_week = l.price_per_day * 7;
          }
        }

        // Stage 5.5: Semantic re-ranking with OpenAI embeddings
        const searchText = parsed.optimized_search_query || parsed.corrected_query || q;
        const ranked = await semanticRank(searchText, allListings);
        const rankedListings = ranked.length > 0 ? ranked : allListings;

        // Sort + diversify (max 3 per domain)
        rankedListings.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));

        const sourceCounts = new Map<string, number>();
        const finalListings = rankedListings.filter((l) => {
          const domain = getDomain(l.source_url);
          const count = sourceCounts.get(domain) || 0;
          if (count >= 3) return false;
          sourceCounts.set(domain, count + 1);
          return true;
        }).slice(0, 20);

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
        });
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
